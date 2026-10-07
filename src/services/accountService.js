import { all } from "../database.js";

export async function getAccounts() {
  return all(`
    SELECT
      a.id,
      a.name,
      a.balance,
      a.is_active,
      c.code AS currency,
      c.symbol
    FROM accounts a
    JOIN currencies c
      ON a.currency_id = c.id
    ORDER BY a.name
  `);
}