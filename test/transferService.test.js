import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import { get, run } from "../src/database.js";
import { createTransfer } from "../src/services/transferService.js";
import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("createTransfer", () => {
  test("moves money between accounts and records transfer", async () => {
    const sourceBefore = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const destinationBefore = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [2]
    );

    const transferId = await createTransfer({
      sourceAccountId: 1,
      destinationAccountId: 2,
      sentAmount: 50,
      receivedAmount: 1300000,
      exchangeRate: 26000,
      sentDate: "2026-10-07",
      receivedDate: "2026-10-07",
    });

    const sourceAfter = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const destinationAfter = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [2]
    );

    const transfer = await get(
      "SELECT * FROM transfers WHERE id = ?",
      [transferId]
    );

    expect(sourceAfter.balance).toBe(
      sourceBefore.balance - 50
    );

    expect(destinationAfter.balance).toBe(
      destinationBefore.balance + 1300000
    );

    expect(transfer.sent_amount).toBe(50);
    expect(transfer.received_amount).toBe(1300000);
    expect(transfer.status).toBe("completed");
  });
});

describe("database transactions", () => {
  test("rolls back changes when an operation fails", async () => {
    const before = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    try {
      await run("BEGIN TRANSACTION");

      await run(
        `
          UPDATE accounts
          SET balance = balance - ?
          WHERE id = ?
        `,
        [100, 1]
      );

      // Deliberately violate a database constraint.
      await run(
        `
          INSERT INTO transactions
            (name, amount, type, date, category_id, account_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          "Invalid Transaction",
          -50,
          "expense",
          "2026-10-07",
          1,
          1,
        ]
      );

      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
    }

    const after = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const invalidTransaction = await get(
      `
        SELECT *
        FROM transactions
        WHERE name = ?
      `,
      ["Invalid Transaction"]
    );

    expect(after.balance).toBe(before.balance);
    expect(invalidTransaction).toBeUndefined();
  });
});

