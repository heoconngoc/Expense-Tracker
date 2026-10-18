import { get, run } from "../database.js";
import AppError from "../errors/AppError.js";

function mapSettings(row) {
  if (!row) {
    return null;
  }

  return {
    baseCurrencyId: row.base_currency_id,
    manualGoldPriceVndPerLuong:
      row.manual_gold_price_vnd_per_luong,
    cachedGoldPriceVndPerLuong:
      row.cached_gold_price_vnd_per_luong,
    cachedGoldPriceSource: row.cached_gold_price_source,
    cachedGoldPriceFetchedAt:
      row.cached_gold_price_fetched_at,
  };
}

export async function getSettings() {
  const row = await get(
    "SELECT * FROM app_settings WHERE id = 1"
  );

  return mapSettings(row);
}

function assertPositivePrice(price) {
  if (!Number.isInteger(price) || price <= 0) {
    throw new AppError(
      "price must be a positive integer in VND per luong",
      400
    );
  }
}

export async function setManualGoldPrice(price) {
  assertPositivePrice(price);

  await run(
    `
      UPDATE app_settings
      SET manual_gold_price_vnd_per_luong = ?
      WHERE id = 1
    `,
    [price]
  );

  return getSettings();
}

export async function clearManualGoldPrice() {
  await run(
    `
      UPDATE app_settings
      SET manual_gold_price_vnd_per_luong = NULL
      WHERE id = 1
    `
  );

  return getSettings();
}

export async function setCachedGoldPrice({
  price,
  source,
  fetchedAt,
}) {
  assertPositivePrice(price);

  await run(
    `
      UPDATE app_settings
      SET
        cached_gold_price_vnd_per_luong = ?,
        cached_gold_price_source = ?,
        cached_gold_price_fetched_at = ?
      WHERE id = 1
    `,
    [price, source, fetchedAt]
  );
}
