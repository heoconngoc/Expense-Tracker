import { all, get } from "../database.js";
import AppError from "../errors/AppError.js";

export async function getDashboard({
  start,
  end,
  currency,
  accountId,
}) {
  const currencyRow = await get(
    `
      SELECT id, code, decimal_places AS decimalPlaces
      FROM currencies
      WHERE code = ?
    `,
    [currency]
  );

  if (!currencyRow) {
    throw new AppError("Currency not found", 400);
  }

  if (accountId) {
    const account = await get(
      "SELECT id FROM accounts WHERE id = ?",
      [accountId]
    );

    if (!account) {
      throw new AppError("Account not found", 400);
    }
  }

  const filters = [
    currencyRow.id,
    ...(accountId ? [accountId] : []),
  ];

  const accountClause = accountId ? " AND a.id = ?" : "";

  const totals = await get(
    `
      SELECT
        COALESCE(
          SUM(CASE
            WHEN t.type = 'income' THEN t.amount
            ELSE 0
          END),
          0
        ) AS totalIncome,

        COALESCE(
          SUM(CASE
            WHEN t.type = 'expense' THEN t.amount
            ELSE 0
          END),
          0
        ) AS totalExpense

      FROM transactions t
      JOIN accounts a
        ON t.account_id = a.id

      WHERE t.date >= ?
        AND t.date < ?
        AND a.currency_id = ?${accountClause}
    `,
    [start, end, ...filters]
  );

  const byCategory = await all(
    `
      SELECT
        cat.name AS category,
        SUM(t.amount) AS total

      FROM transactions t
      JOIN categories cat
        ON t.category_id = cat.id
      JOIN accounts a
        ON t.account_id = a.id

      WHERE t.type = 'expense'
        AND t.date >= ?
        AND t.date < ?
        AND a.currency_id = ?${accountClause}

      GROUP BY cat.id, cat.name
      ORDER BY total DESC
    `,
    [start, end, ...filters]
  );

  return {
    currency,
    decimalPlaces: currencyRow.decimalPlaces,
    accountId: accountId ?? null,
    totalIncome: totals.totalIncome,
    totalExpense: totals.totalExpense,
    net: totals.totalIncome - totals.totalExpense,
    byCategory,
  };
}