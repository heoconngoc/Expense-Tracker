import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import { get, run } from "../src/database.js";

import {
  createTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction,
  deleteTransaction,
} from "../src/services/transactionService.js";

import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("createTransaction", () => {
  test("creates an expense and decreases account balance", async () => {
    const before = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const transaction = await createTransaction({
      name: "Test Coffee",
      amount: 10,
      type: "expense",
      date: "2026-10-07",
      categoryId: 1,
      accountId: 1,
    });

    const after = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    expect(transaction.name).toBe("Test Coffee");
    expect(after.balance).toBe(before.balance - 10);
  });

  test("creates income and increases account balance", async () => {
    const before = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    await createTransaction({
      name: "Freelance Work",
      amount: 100,
      type: "income",
      date: "2026-10-07",
      categoryId: 2,
      accountId: 1,
    });

    const after = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    expect(after.balance).toBe(before.balance + 100);
  });

  test("rejects invalid transaction", async () => {
    await expect(
      createTransaction({
        name: "Invalid Expense",
        amount: -10,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects a non-integer amount", async () => {
    await expect(
      createTransaction({
        name: "Float Expense",
        amount: 6.75,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("rejects transaction with nonexistent category", async () => {
    await expect(
      createTransaction({
        name: "Coffee",
        amount: 5,
        type: "expense",
        date: "2026-10-07",
        categoryId: 999999,
        accountId: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("updateTransaction", () => {
  test("undoes old balance effect and applies new balance effect", async () => {
    const transaction = await createTransaction({
      name: "Original Expense",
      amount: 10,
      type: "expense",
      date: "2026-10-07",
      categoryId: 1,
      accountId: 1,
    });

    const account1BeforeUpdate = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const account2BeforeUpdate = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [3]
    );

    await updateTransaction(transaction.id, {
      name: "Updated Income",
      amount: 50,
      type: "income",
      date: "2026-10-07",
      categoryId: 2,
      accountId: 3,
    });

    const account1After = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const account2After = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [3]
    );

    expect(account1After.balance).toBe(
      account1BeforeUpdate.balance + 10
    );

    expect(account2After.balance).toBe(
      account2BeforeUpdate.balance + 50
    );
  });

  test("rejects transaction using inactive account", async () => {
    await run(
      "UPDATE accounts SET is_active = 0 WHERE id = ?",
      [1]
    );

    await expect(
      createTransaction({
        name: "Coffee",
        amount: 5,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("deleteTransaction", () => {
  test("deletes transaction and restores account balance", async () => {
    const originalAccount = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    const transaction = await createTransaction({
      name: "Temporary Expense",
      amount: 25,
      type: "expense",
      date: "2026-10-07",
      categoryId: 1,
      accountId: 1,
    });

    await deleteTransaction(transaction.id);

    const deletedTransaction = await get(
      "SELECT * FROM transactions WHERE id = ?",
      [transaction.id]
    );

    const accountAfter = await get(
      "SELECT balance FROM accounts WHERE id = ?",
      [1]
    );

    expect(deletedTransaction).toBeUndefined();
    expect(accountAfter.balance).toBe(
      originalAccount.balance
    );
  });

  test("throws when deleting a missing transaction", async () => {
    await expect(deleteTransaction(999999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("validation edge cases", () => {
  const base = {
    name: "Edge",
    amount: 10,
    type: "expense",
    date: "2026-10-07",
    categoryId: 1,
    accountId: 1,
  };

  test("rejects a missing name", async () => {
    await expect(
      createTransaction({ ...base, name: "   " })
    ).rejects.toThrow("Name is required");
  });

  test("rejects a zero amount", async () => {
    await expect(
      createTransaction({ ...base, amount: 0 })
    ).rejects.toThrow("Amount must be greater than 0");
  });

  test("rejects an unknown type", async () => {
    await expect(
      createTransaction({ ...base, type: "transfer" })
    ).rejects.toThrow("Type must be income or expense");
  });

  test("rejects a missing date", async () => {
    await expect(
      createTransaction({ ...base, date: "" })
    ).rejects.toThrow("Date is required");
  });

  test("rejects a missing category", async () => {
    await expect(
      createTransaction({ ...base, categoryId: 0 })
    ).rejects.toThrow("Category is required");
  });

  test("rejects a missing account", async () => {
    await expect(
      createTransaction({ ...base, accountId: 0 })
    ).rejects.toThrow("Account is required");
  });

  test("throws when updating a missing transaction", async () => {
    await expect(
      updateTransaction(999999, base)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("getTransactions filters", () => {
  test("returns all transactions without filters", async () => {
    const transactions = await getTransactions();

    expect(transactions.length).toBeGreaterThan(0);
  });

  test("filters by type", async () => {
    const income = await getTransactions({ type: "income" });

    expect(income.length).toBeGreaterThan(0);
    expect(income.every((item) => item.type === "income")).toBe(true);
  });

  test("filters by category", async () => {
    const food = await getTransactions({ categoryId: 1 });

    expect(food.length).toBeGreaterThan(0);
    expect(food.every((item) => item.categoryId === 1)).toBe(true);
  });

  test("filters by account", async () => {
    const rows = await getTransactions({ accountId: 2 });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((item) => item.accountId === 2)).toBe(true);
  });

  test("filters by date range", async () => {
    const october = await getTransactions({
      start: "2026-10-01",
      end: "2026-11-01",
    });

    expect(october.length).toBeGreaterThan(0);
    expect(
      october.every(
        (item) => item.date >= "2026-10-01" && item.date < "2026-11-01"
      )
    ).toBe(true);
  });
});

describe("getTransactionById", () => {
  test("returns a joined transaction with currency info", async () => {
    const created = await createTransaction({
      name: "Joined",
      amount: 12,
      type: "expense",
      date: "2026-10-07",
      categoryId: 1,
      accountId: 1,
    });

    const found = await getTransactionById(created.id);

    expect(found.name).toBe("Joined");
    expect(found.category).toBe("Food");
    expect(found.currency).toBe("USD");
  });
});