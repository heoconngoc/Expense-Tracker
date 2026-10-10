import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import fs from "fs";
import { get, run, withTransaction } from "../src/database.js";
import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("reference seed", () => {
  test("contains no accounts, transactions, or transfers", () => {
    const sql = fs.readFileSync(
      "database/seed-reference.sql",
      "utf8"
    );

    expect(sql).toContain("INSERT INTO currencies");
    expect(sql).toContain("INSERT INTO categories");

    expect(sql).not.toContain("INSERT INTO accounts");
    expect(sql).not.toContain("INSERT INTO transactions");
    expect(sql).not.toContain("INSERT INTO transfers");
  });
});

describe("withTransaction", () => {
  test("commits when the callback succeeds", async () => {
    const before = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    await withTransaction(async () => {
      await run(
        "UPDATE accounts SET balance = balance - 100 WHERE id = ?",
        [1]
      );
    });

    const after = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    expect(after.balance).toBe(before.balance - 100);
  });

  test("rolls back when the callback throws", async () => {
    const before = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    await expect(
      withTransaction(async () => {
        await run(
          "UPDATE accounts SET balance = balance - 100 WHERE id = ?",
          [1]
        );

        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const after = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    expect(after.balance).toBe(before.balance);
  });

  test("a failed BEGIN does not attempt a spurious ROLLBACK", async () => {
    await run("BEGIN IMMEDIATE");

    try {
      await expect(
        withTransaction(async () => {})
      ).rejects.toBeDefined();
    } finally {
      await run("ROLLBACK");
    }

    const row = await get("SELECT 1 AS ok");

    expect(row.ok).toBe(1);
  });
});
