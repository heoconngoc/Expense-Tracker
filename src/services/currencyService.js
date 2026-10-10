import { all } from "../database.js";

export async function getCurrencies({ activeOnly = false } = {}) {
  let sql = `
    SELECT
      id,
      code,
      currency_name AS name,
      symbol,
      decimal_places AS decimalPlaces,
      is_active AS isActive
    FROM currencies
  `;

  if (activeOnly) {
    sql += " WHERE is_active = 1";
  }

  sql += " ORDER BY id";

  return all(sql);
}
