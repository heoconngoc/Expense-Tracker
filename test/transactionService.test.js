import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import { get, run } from "../src/database.js";

import {
  createTransaction,
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
});