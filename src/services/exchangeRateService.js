import { all, get, run } from "../database.js";
import AppError from "../errors/AppError.js";

export const FX_URL =
  "https://open.er-api.com/v6/latest/USD";

const RATE_SCALE = 1_000_000;

export async function getRates() {
  const rows = await all(
    `
      SELECT
        c.id AS currencyId,
        c.code,
        c.currency_name AS name,
        c.symbol,
        c.decimal_places AS decimalPlaces,
        COALESCE(er.rate_to_vnd, 0) AS rateToVndMicro,
        er.source,
        er.updated_at AS updatedAt
      FROM currencies c
      LEFT JOIN exchange_rates er
        ON er.currency_id = c.id
      WHERE c.is_active = 1
      ORDER BY c.id
    `
  );

  return rows.map((row) => ({
    currencyId: row.currencyId,
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalPlaces: row.decimalPlaces,
    rateToVnd: row.rateToVndMicro / RATE_SCALE,
    source: row.source,
    updatedAt: row.updatedAt,
  }));
}

async function upsertRate({
  currencyId,
  rateToVndMicro,
  source,
}) {
  const existing = await get(
    "SELECT id FROM exchange_rates WHERE currency_id = ?",
    [currencyId]
  );

  if (existing) {
    await run(
      `
        UPDATE exchange_rates
        SET
          rate_to_vnd = ?,
          source = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE currency_id = ?
      `,
      [rateToVndMicro, source, currencyId]
    );

    return;
  }

  await run(
    `
      INSERT INTO exchange_rates (currency_id, rate_to_vnd, source)
      VALUES (?, ?, ?)
    `,
    [currencyId, rateToVndMicro, source]
  );
}

export async function setRate({
  currencyId,
  rateToVnd,
  source = "manual",
}) {
  if (!Number.isFinite(rateToVnd) || rateToVnd <= 0) {
    throw new AppError(
      "rateToVnd must be a positive number",
      400
    );
  }

  const currency = await get(
    "SELECT id FROM currencies WHERE id = ?",
    [currencyId]
  );

  if (!currency) {
    throw new AppError("Currency not found", 404);
  }

  await upsertRate({
    currencyId,
    rateToVndMicro: Math.round(rateToVnd * RATE_SCALE),
    source,
  });

  const rates = await getRates();

  return rates.find(
    (rate) => rate.currencyId === currencyId
  );
}

export async function fetchRates({
  fetchImpl = globalThis.fetch,
} = {}) {
  const response = await fetchImpl(FX_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new AppError(
      `Exchange rate API returned ${response.status}`,
      502
    );
  }

  const payload = await response.json();
  const vndPerUsd = payload?.rates?.VND;

  if (
    payload?.result !== "success" ||
    !Number.isFinite(vndPerUsd) ||
    vndPerUsd <= 0
  ) {
    throw new AppError(
      "Unexpected exchange rate response",
      502
    );
  }

  const currencies = await all(
    "SELECT id, code FROM currencies WHERE is_active = 1"
  );

  const updated = [];

  for (const currency of currencies) {
    const perUsd = payload.rates[currency.code];

    if (!Number.isFinite(perUsd) || perUsd <= 0) {
      continue;
    }

    const rateToVndMicro = Math.round(
      (vndPerUsd / perUsd) * RATE_SCALE
    );

    await upsertRate({
      currencyId: currency.id,
      rateToVndMicro,
      source: "api",
    });

    updated.push({
      currencyId: currency.id,
      code: currency.code,
      rateToVnd: rateToVndMicro / RATE_SCALE,
    });
  }

  return updated;
}
