import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import { get, run } from "../src/database.js";
import {
  createTransfer,
  completeTransfer,
} from "../src/services/transferService.js";
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

    const created = await createTransfer({
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
      [created.id]
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

    // exchange_rate is stored as an integer in micro units.
    expect(transfer.exchange_rate).toBe(26000000000);
  });

  test("rejects transfer to the same account", async () => {
    await expect(
      createTransfer({
        sourceAccountId: 1,
        destinationAccountId: 1,
        sentAmount: 50,
        receivedAmount: 50,
        exchangeRate: 1,
        sentDate: "2026-10-07",
        receivedDate: "2026-10-07",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects a transfer from an inactive account", async () => {
    await run(
      "UPDATE accounts SET is_active = 0 WHERE id = ?",
      [1]
    );

    await expect(
      createTransfer({
        sourceAccountId: 1,
        destinationAccountId: 2,
        sentAmount: 50,
        receivedAmount: 50,
        exchangeRate: 1,
        sentDate: "2026-10-07",
        receivedDate: "2026-10-07",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects a transfer with insufficient balance", async () => {
    await expect(
      createTransfer({
        sourceAccountId: 1,
        destinationAccountId: 2,
        sentAmount: 999999999,
        receivedAmount: 100,
        exchangeRate: 1,
        sentDate: "2026-10-07",
        receivedDate: "2026-10-07",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects a non-integer sent amount", async () => {
    await expect(
      createTransfer({
        sourceAccountId: 1,
        destinationAccountId: 2,
        sentAmount: 50.5,
        receivedAmount: 100,
        exchangeRate: 1,
        sentDate: "2026-10-07",
        receivedDate: "2026-10-07",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("creates a pending transfer without changing balances", async () => {
    const before = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const created = await createTransfer({
      sourceAccountId: 1,
      destinationAccountId: 2,
      sentAmount: 5000,
      exchangeRate: 26000,
      status: "pending",
      sentDate: "2026-10-07",
    });

    const after = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    expect(created.status).toBe("pending");
    expect(created.receivedAmount).toBeNull();
    expect(after.balance).toBe(before.balance);
  });
});

describe("completeTransfer", () => {
  test("completes a pending transfer and updates both balances", async () => {
    const created = await createTransfer({
      sourceAccountId: 1,
      destinationAccountId: 2,
      sentAmount: 5000,
      exchangeRate: 26000,
      status: "pending",
      sentDate: "2026-10-07",
    });

    const sourceBefore = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const destinationBefore = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [2]
    );

    const completed = await completeTransfer(created.id, {
      receivedAmount: 1300000,
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

    expect(completed.status).toBe("completed");
    expect(sourceAfter.balance).toBe(
      sourceBefore.balance - 5000
    );
    expect(destinationAfter.balance).toBe(
      destinationBefore.balance + 1300000
    );
  });

  test("rejects completing an already completed transfer", async () => {
    const created = await createTransfer({
      sourceAccountId: 1,
      destinationAccountId: 3,
      sentAmount: 1000,
      receivedAmount: 1000,
      exchangeRate: 1,
      sentDate: "2026-10-07",
      receivedDate: "2026-10-07",
    });

    await expect(
      completeTransfer(created.id, {
        receivedAmount: 1000,
        receivedDate: "2026-10-08",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects completing a missing transfer", async () => {
    await expect(
      completeTransfer(999999, {
        receivedAmount: 100,
        receivedDate: "2026-10-08",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
    });
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
