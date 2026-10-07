import { get, run, all } from "../database.js";
import AppError from "../errors/AppError.js";

function balanceEffect(type, amount) {
  return type === "income" ? amount : -amount;
}

async function validateReferences(categoryId, accountId) {
  const category = await get(
    `
      SELECT id
      FROM categories
      WHERE id = ?
        AND is_active = 1
    `,
    [categoryId]
  );

  if (!category) {
    throw new AppError(
      "Category not found or inactive",
      400
    );
  }

  const account = await get(
    `
      SELECT id
      FROM accounts
      WHERE id = ?
        AND is_active = 1
    `,
    [accountId]
  );

  if (!account) {
    throw new AppError(
      "Account not found or inactive",
      400
    );
  }
}

function validateTransaction({ name, amount, type, date, categoryId, accountId, }) {
  if (!name?.trim()) {
    throw new AppError("Name is required", 400);
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new AppError("Amount must be greater than 0", 400);
  }

  if (!["income", "expense"].includes(type)) {
    throw new AppError("Type must be income or expense", 400);
  }

  if (!date) {
    throw new AppError("Date is required", 400);
  }

  if (!categoryId) {
    throw new AppError("Category is required", 400);
  }

  if (!accountId) {
    throw new AppError("Account is required", 400);
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
  validateTransaction({name, amount, type, date, categoryId, accountId});

  await validateReferences(categoryId, accountId);

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

    return await get(
      "SELECT * FROM transactions WHERE id = ?",
      [result.lastID]
    );
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

export async function getTransactionById(id) {
  return get(
    `
      SELECT
        t.id,
        t.name,
        t.amount,
        t.type,
        t.date,
        t.notes,
        t.category_id,
        c.name AS category,
        t.account_id,
        a.name AS account,
        cur.code AS currency
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      JOIN currencies cur ON a.currency_id = cur.id
      WHERE t.id = ?
    `,
    [id]
  );
}

export async function getTransactions({
  type,
  categoryId,
  accountId,
  start,
  end,
} = {}) {
  let sql = `
    SELECT
      t.id,
      t.name,
      t.amount,
      t.type,
      t.date,
      t.notes,
      c.name AS category,
      a.name AS account,
      cur.code AS currency
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    JOIN accounts a ON t.account_id = a.id
    JOIN currencies cur ON a.currency_id = cur.id
    WHERE 1 = 1
  `;

  const params = [];

  if (type) {
    sql += " AND t.type = ?";
    params.push(type);
  }

  if (categoryId) {
    sql += " AND t.category_id = ?";
    params.push(categoryId);
  }

  if (accountId) {
    sql += " AND t.account_id = ?";
    params.push(accountId);
  }

  if (start) {
    sql += " AND t.date >= ?";
    params.push(start);
  }

  if (end) {
    sql += " AND t.date < ?";
    params.push(end);
  }

  sql += " ORDER BY t.date DESC, t.id DESC";

  return all(sql, params);
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
  validateTransaction({name, amount, type, date, categoryId, accountId});

  await validateReferences(categoryId, accountId);
  
  try {
    await run("BEGIN TRANSACTION");

    const oldTransaction = await get(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (!oldTransaction) {
      throw new AppError("Transaction not found", 404);
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
      throw new AppError("Transaction not found", 404);
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