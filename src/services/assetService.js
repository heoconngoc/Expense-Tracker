import { all } from "../database.js";
import { getCurrentGoldPrice } from "./goldPriceService.js";
import { holdingValueVnd } from "./goldHoldingService.js";

const RATE_SCALE = 1_000_000;

export function convertMinorToVnd({
  balance,
  decimalPlaces,
  rateToVndMicro,
}) {
  return Math.round(
    (balance * rateToVndMicro) /
      RATE_SCALE /
      10 ** decimalPlaces
  );
}

export async function getAssets({
  getGoldPrice = getCurrentGoldPrice,
} = {}) {
  const accounts = await all(
    `
      SELECT
        a.id,
        a.name,
        a.balance,
        a.type,
        a.currency_id AS currencyId,
        c.code AS currency,
        c.symbol,
        c.decimal_places AS decimalPlaces
      FROM accounts a
      JOIN currencies c ON c.id = a.currency_id
      WHERE a.is_active = 1
      ORDER BY a.name
    `
  );

  const rateRows = await all(
    "SELECT currency_id AS currencyId, rate_to_vnd AS micro FROM exchange_rates"
  );
  const rates = new Map(
    rateRows.map((row) => [row.currencyId, row.micro])
  );

  const holdingRows = await all(
    "SELECT account_id AS accountId, quantity, unit FROM gold_holdings"
  );
  const holdingsByAccount = new Map();

  for (const holding of holdingRows) {
    const list =
      holdingsByAccount.get(holding.accountId) ?? [];

    list.push(holding);
    holdingsByAccount.set(holding.accountId, list);
  }

  const needsGoldPrice = accounts.some(
    (account) =>
      account.type === "gold" &&
      holdingsByAccount.has(account.id)
  );

  const goldPrice = needsGoldPrice
    ? await getGoldPrice()
    : null;

  const missingRates = new Set();
  const byType = { spending: 0, savings: 0, gold: 0 };

  const result = accounts.map((account) => {
    let valueVnd;

    if (account.type === "gold") {
      const list = holdingsByAccount.get(account.id) ?? [];

      valueVnd = list.reduce(
        (sum, holding) =>
          sum +
          holdingValueVnd({
            quantityMilli: holding.quantity,
            unit: holding.unit,
            priceVndPerLuong: goldPrice.price,
          }),
        0
      );
    } else {
      const rateToVndMicro = rates.get(account.currencyId);

      if (!rateToVndMicro) {
        missingRates.add(account.currency);
        valueVnd = null;
      } else {
        valueVnd = convertMinorToVnd({
          balance: account.balance,
          decimalPlaces: account.decimalPlaces,
          rateToVndMicro,
        });
      }
    }

    if (valueVnd !== null) {
      byType[account.type] += valueVnd;
    }

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      symbol: account.symbol,
      decimalPlaces: account.decimalPlaces,
      valueVnd,
    };
  });

  const total = Object.values(byType).reduce(
    (sum, value) => sum + value,
    0
  );

  return {
    currency: "VND",
    total,
    byType,
    missingRates: [...missingRates],
    goldPrice,
    accounts: result,
  };
}
