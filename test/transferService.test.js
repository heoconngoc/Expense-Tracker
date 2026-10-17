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
  getTransfers,
  getTransferById,
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

describe("createTransfer edge cases", () => {
  const base = {
    sourceAccountId: 1,
    destinationAccountId: 2,
    sentAmount: 50,
    receivedAmount: 50,
    exchangeRate: 1,
    sentDate: "2026-10-07",
    receivedDate: "2026-10-07",
  };

  test("rejects a missing destination account", async () => {
    await expect(
      createTransfer({ ...base, destinationAccountId: 999999 })
    ).rejects.toThrow(
      "Destination account not found or inactive"
    );
  });

  test("rejects a non-positive exchange rate", async () => {
    await expect(
      createTransfer({ ...base, exchangeRate: 0 })
    ).rejects.toThrow("exchangeRate must be a positive number");
  });

  test("rejects an unknown status", async () => {
    await expect(
      createTransfer({ ...base, status: "draft" })
    ).rejects.toThrow("Status must be pending or completed");
  });

  test("rejects a completed transfer without received amount", async () => {
    await expect(
      createTransfer({ ...base, receivedAmount: 0 })
    ).rejects.toThrow(
      "receivedAmount must be a positive integer"
    );
  });

  test("rejects a completed transfer without received date", async () => {
    await expect(
      createTransfer({ ...base, receivedDate: null })
    ).rejects.toThrow(
      "receivedDate is required for a completed transfer"
    );
  });

  test("rejects a transfer without sent date", async () => {
    await expect(
      createTransfer({ ...base, sentDate: "" })
    ).rejects.toThrow("sentDate is required");
  });
});

describe("completeTransfer edge cases", () => {
  test("rejects a missing received date", async () => {
    const created = await createTransfer({
      sourceAccountId: 1,
      destinationAccountId: 2,
      sentAmount: 1000,
      exchangeRate: 1,
      status: "pending",
      sentDate: "2026-10-07",
    });

    await expect(
      completeTransfer(created.id, { receivedAmount: 1000 })
    ).rejects.toThrow("receivedDate is required");
  });

  test("rejects completion when the source no longer has enough", async () => {
    const created = await createTransfer({
      sourceAccountId: 1,
      destinationAccountId: 2,
      sentAmount: 5000,
      exchangeRate: 1,
      status: "pending",
      sentDate: "2026-10-07",
    });

    await run(
      "UPDATE accounts SET balance = ? WHERE id = ?",
      [10, 1]
    );

    await expect(
      completeTransfer(created.id, {
        receivedAmount: 5000,
        receivedDate: "2026-10-08",
      })
    ).rejects.toThrow("Insufficient balance");
  });
});

describe("getTransfers", () => {
  test("returns all transfers and exposes a decimal exchange rate", async () => {
    const transfers = await getTransfers();

    expect(transfers.length).toBeGreaterThan(0);
    expect(typeof transfers[0].exchangeRate).toBe("number");
  });

  test("filters by status", async () => {
    const pending = await getTransfers({ status: "pending" });

    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((item) => item.status === "pending")).toBe(true);
  });

  test("reads a single transfer with currency metadata", async () => {
    const all = await getTransfers();
    const transfer = await getTransferById(all[0].id);

    expect(transfer.sourceCurrency).toBeTruthy();
    expect(transfer.destinationCurrency).toBeTruthy();
  });
});
