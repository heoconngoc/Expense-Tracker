import { get, run } from "../database.js";

function balanceEffect(type, amount) {
  return type === "income" ? amount : -amount;
}

function validateTransaction({ name, amount, type, date, categoryId, accountId }) {
  if (!name?.trim()) {
    throw new Error("Name is required");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (!["income", "expense"].includes(type)) {
    throw new Error("Type must be income or expense");
  }

  if (!date) {
    throw new Error("Date is required");
  }

  if (!categoryId) {
    throw new Error("Category is required");
  }

  if (!accountId) {
    throw new Error("Account is required");
  }
}

export async function createTransaction({
  name,
  amount,
  type,
  date,
  notes = null,
  categoryId,
  accountId,
}) {
  validateTransaction(name, amount, type, date, categoryId, accountId);

  try {
    await run("BEGIN TRANSACTION");

    const result = await run(
      `
        INSERT INTO transactions
          (name, amount, type, date, notes, category_id, account_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        amount,
        type,
        date,
        notes,
        categoryId,
        accountId,
      ]
    );

    const balanceChange = balanceEffect(type, amount);

    await run(
      `
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
      `,
      [balanceChange, accountId]
    );

    await run("COMMIT");

    return result.lastID;
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

export async function updateTransaction(
  id,
  {
    name,
    amount,
    type,
    date,
    notes = null,
    categoryId,
    accountId,
  }
) {
  validateTransaction(name, amount, type, date, categoryId, accountId);

  try {
    await run("BEGIN TRANSACTION");

    const oldTransaction = await get(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!oldTransaction) {
      throw new Error("Transaction not found");
    }

    // Undo the old transaction's balance effect.
    await run(
      `
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
      `,
      [
        -balanceEffect(oldTransaction.type, oldTransaction.amount),
        oldTransaction.account_id,
      ]
    );

    // Update the transaction itself.
    await run(
      `
        UPDATE transactions
        SET
          name = ?,
          amount = ?,
          type = ?,
          date = ?,
          notes = ?,
          category_id = ?,
          account_id = ?
        WHERE id = ?
      `,
      [
        name,
        amount,
        type,
        date,
        notes,
        categoryId,
        accountId,
        id,
      ]
    );

    // Apply the new transaction's balance effect.
    await run(
      `
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
      `,
      [
        balanceEffect(type, amount),
        accountId,
      ]
    );

    await run("COMMIT");
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

export async function deleteTransaction(id) {
  try {
    await run("BEGIN TRANSACTION");

    const transaction = await get(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await run(
      `
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
      `,
      [
        -balanceEffect(transaction.type, transaction.amount),
        transaction.account_id,
      ]
    );

    await run(
      "DELETE FROM transactions WHERE id = ?",
      [id]
    );

    await run("COMMIT");
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}