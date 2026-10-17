import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import {
  exportData,
  importData,
} from "../src/services/backupService.js";

import {
  addContribution,
  createGoal,
  getGoals,
} from "../src/services/savingsGoalService.js";

import { all, run } from "../src/database.js";

import { resetDatabase } from "./setup.js";

const TABLES = [
  "currencies",
  "categories",
  "accounts",
  "transactions",
  "transfers",
  "gold_holdings",
  "savings_goals",
  "savings_contributions",
  "exchange_rates",
  "app_settings",
];

beforeEach(async () => {
  await resetDatabase();
});

/**
 * Delete the seeded accounts in child-first order so foreign keys
 * stay satisfied, the way real data loss / restore would encounter it.
 */
async function deleteAllAccounts() {
  await run("DELETE FROM transfers");
  await run("DELETE FROM transactions");
  await run("DELETE FROM accounts");
}

describe("exportData", () => {
  test("exports every data table with the current version", async () => {
    const backup = await exportData();

    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBeTruthy();

    for (const table of TABLES) {
      expect(Array.isArray(backup.data[table])).toBe(true);
    }

    expect(backup.data.currencies).toHaveLength(2);
    expect(backup.data.accounts).toHaveLength(4);
    expect(backup.data.app_settings).toHaveLength(1);
  });
});

describe("importData", () => {
  test("rejects a payload without data", async () => {
    await expect(importData({})).rejects.toThrow(
      "Backup file is missing data"
    );
  });

  test("rejects a table that is not an array", async () => {
    await expect(
      importData({ data: { currencies: {} } })
    ).rejects.toThrow("Backup table currencies is not an array");
  });

  test("restores deleted rows from a full backup", async () => {
    const backup = await exportData();

    await deleteAllAccounts();

    expect(await all("SELECT id FROM accounts")).toHaveLength(0);

    await importData(backup);

    expect(await all("SELECT id FROM accounts")).toHaveLength(4);
  });

  test("keeps related rows valid after a restore", async () => {
    const goal = await createGoal({
      name: "Holiday",
      targetAmount: 5000000,
      currencyId: 2,
    });

    await addContribution(goal.id, { amount: 1000000 });

    const backup = await exportData();

    await deleteAllAccounts();

    await importData(backup);

    const goals = await getGoals({ includeArchived: true });

    expect(goals).toHaveLength(1);
    expect(goals[0].totalContributed).toBe(1000000);
  });

  test("rolls back the whole restore when a row is invalid", async () => {
    const backup = await exportData();

    backup.data.currencies.push({
      id: 1,
      code: "BAD",
      currency_name: "Bad",
      symbol: "!",
      decimal_places: 0,
      is_active: 1,
    });

    await expect(importData(backup)).rejects.toThrow();

    expect(await all("SELECT id FROM currencies")).toHaveLength(2);
  });
});
