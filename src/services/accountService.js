import { all } from "../database.js";

export async function getAccounts({ activeOnly = false } = {}) {
  let sql = `
    SELECT
      a.id,
      a.name,
      a.balance,
      a.is_active AS isActive,
      c.code AS currency,
      c.symbol,
      c.decimal_places AS decimalPlaces
    FROM accounts a
    JOIN currencies c
      ON a.currency_id = c.id
  `;

  if (activeOnly) {
    sql += " WHERE a.is_active = 1";
  }

  sql += " ORDER BY a.name";

  return all(sql);
}
