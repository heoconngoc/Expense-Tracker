import { all, get } from "../database.js";
import AppError from "../errors/AppError.js";

const DEFAULT_TREND_MONTHS = 6;

function monthKey(date) {
  const month = String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  );

  return `${date.getUTCFullYear()}-${month}`;
}

/**
 * The list of calendar months that end just before `end`, oldest
 * first. For end = 2026-11-01 and count = 3 it returns
 * ["2026-08", "2026-09", "2026-10"].
 */
export function recentMonths(end, count) {
  const endDate = new Date(`${end}T00:00:00Z`);
  const cursor = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      1
    )
  );

  const months = [];

  for (let i = 0; i < count; i += 1) {
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    months.unshift(monthKey(cursor));
  }

  return months;
}

export async function getDashboard({
  start,
  end,
  currency,
  accountId,
  months = DEFAULT_TREND_MONTHS,
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

  const trendMonths =
    Number.isInteger(months) && months > 0
      ? recentMonths(end, months)
      : [];

  let monthly = [];

  if (trendMonths.length > 0) {
    const trendStart = `${trendMonths[0]}-01`;

    const monthlyRows = await all(
      `
        SELECT
          strftime('%Y-%m', t.date) AS month,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense

        FROM transactions t
        JOIN accounts a
          ON t.account_id = a.id

        WHERE t.date >= ?
          AND t.date < ?
          AND a.currency_id = ?${accountClause}

        GROUP BY month
      `,
      [trendStart, end, ...filters]
    );

    const byMonth = new Map(
      monthlyRows.map((row) => [row.month, row])
    );

    monthly = trendMonths.map((month) => {
      const row = byMonth.get(month);

      return {
        month,
        income: row?.income ?? 0,
        expense: row?.expense ?? 0,
      };
    });
  }

  return {
    currency,
    decimalPlaces: currencyRow.decimalPlaces,
    accountId: accountId ?? null,
    totalIncome: totals.totalIncome,
    totalExpense: totals.totalExpense,
    net: totals.totalIncome - totals.totalExpense,
    byCategory,
    monthly,
  };
}