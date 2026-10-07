import { all, get } from "../database.js";

export async function getDashboard({
  start,
  end,
  currency,
}) {
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
      JOIN currencies c
        ON a.currency_id = c.id

      WHERE t.date >= ?
        AND t.date < ?
        AND c.code = ?
    `,
    [start, end, currency]
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
      JOIN currencies c
        ON a.currency_id = c.id

      WHERE t.type = 'expense'
        AND t.date >= ?
        AND t.date < ?
        AND c.code = ?

      GROUP BY cat.id, cat.name
      ORDER BY total DESC
    `,
    [start, end, currency]
  );

  return {
    currency,
    totalIncome: totals.totalIncome,
    totalExpense: totals.totalExpense,
    net: totals.totalIncome - totals.totalExpense,
    byCategory,
  };
}