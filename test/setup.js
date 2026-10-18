import fs from "fs";
import { exec } from "../src/database.js";

export async function resetDatabase() {
  const schema = fs.readFileSync(
    "database/schema.sql",
    "utf8"
  );

  const seed = fs.readFileSync(
    "database/seed.sql",
    "utf8"
  );

  await exec(`
    PRAGMA foreign_keys = OFF;

    DROP TABLE IF EXISTS savings_contributions;
    DROP TABLE IF EXISTS savings_goals;
    DROP TABLE IF EXISTS gold_holdings;
    DROP TABLE IF EXISTS exchange_rates;
    DROP TABLE IF EXISTS app_settings;
    DROP TABLE IF EXISTS transfers;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS currencies;

    PRAGMA foreign_keys = ON;
  `);

  await exec(schema);
  await exec(seed);
}