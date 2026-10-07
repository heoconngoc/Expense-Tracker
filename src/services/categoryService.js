import { all } from "../database.js";

export async function getCategories() {
  return all(`
    SELECT id, name
    FROM categories
    WHERE is_active = 1
    ORDER BY name
  `);
}