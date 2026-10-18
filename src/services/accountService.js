import { all, get, run, withTransaction } from "../database.js";
import AppError from "../errors/AppError.js";

const ACCOUNT_TYPES = ["spending", "savings", "gold"];

function assertType(type) {
  if (!ACCOUNT_TYPES.includes(type)) {
    throw new AppError(
      "type must be spending, savings, or gold",
      400
    );
  }
}

function isUniqueViolation(err) {
  const code = err?.code ?? "";
  const isConstraint = code === "SQLITE_CONSTRAINT_UNIQUE";

  const isGenericUnique =
    code === "SQLITE_CONSTRAINT" &&
    /UNIQUE/i.test(err?.message ?? "");

  return isConstraint || isGenericUnique;
}

async function assertCurrencyActive(currencyId) {
  const currency = await get(
    `
      SELECT id
      FROM currencies
      WHERE id = ? AND is_active = 1
    `,
    [currencyId]
  );

  if (!currency) {
    throw new AppError("Currency not found or inactive", 400);
  }
}

async function getAccountById(id) {
  return get(
    `
      SELECT
        a.id,
        a.name,
        a.balance,
        a.currency_id AS currencyId,
        a.type,
        a.is_active AS isActive,
        c.code AS currency,
        c.symbol,
        c.decimal_places AS decimalPlaces
      FROM accounts a
      JOIN currencies c
        ON a.currency_id = c.id
      WHERE a.id = ?
    `,
    [id]
  );
}

export async function getAccounts({ activeOnly = false } = {}) {
  let sql = `
    SELECT
      a.id,
      a.name,
      a.balance,
      a.currency_id AS currencyId,
      a.type,
      a.is_active AS isActive,
      c.code AS currency,
      c.symbol,
      c.decimal_places AS decimalPlaces
    FROM accounts a
    JOIN currencies c
      ON a.currency_id = c.id
  `;

  if (activeOnly) {
    sql += " WHERE a.is_active = 1";
  }

  sql += " ORDER BY a.name";

  return all(sql);
}

export async function createAccount({
  name,
  currencyId,
  initialBalance = 0,
  type = "spending",
}) {
  if (!name?.trim()) {
    throw new AppError("Name is required", 400);
  }

  if (!currencyId) {
    throw new AppError("Currency is required", 400);
  }

  if (!Number.isInteger(initialBalance)) {
    throw new AppError(
      "initialBalance must be an integer in the smallest unit",
      400
    );
  }

  assertType(type);

  return withTransaction(async () => {
    await assertCurrencyActive(currencyId);

    try {
      const result = await run(
        `
          INSERT INTO accounts (name, currency_id, balance, type)
          VALUES (?, ?, ?, ?)
        `,
        [name.trim(), currencyId, initialBalance, type]
      );

      return getAccountById(result.lastID);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError("Account name already exists", 400);
      }

      throw err;
    }
  });
}

export async function updateAccount(
  id,
  { name, currencyId, isActive, type }
) {
  return withTransaction(async () => {
    const account = await get(
      "SELECT * FROM accounts WHERE id = ?",
      [id]
    );

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    const nextName = name?.trim() || account.name;
    const nextCurrencyId = currencyId ?? account.currency_id;
    const nextType = type ?? account.type;
    const nextActive =
      isActive === undefined
        ? account.is_active
        : isActive
          ? 1
          : 0;

    assertType(nextType);

    if (nextCurrencyId !== account.currency_id) {
      const transactionCount = await get(
        "SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?",
        [id]
      );

      const transferCount = await get(
        `
          SELECT COUNT(*) AS count
          FROM transfers
          WHERE source_account_id = ? OR destination_account_id = ?
        `,
        [id, id]
      );

      if (transactionCount.count > 0 || transferCount.count > 0) {
        throw new AppError(
          "Cannot change the currency of an account that already has history",
          400
        );
      }

      await assertCurrencyActive(nextCurrencyId);
    }

    try {
      await run(
        `
          UPDATE accounts
          SET name = ?, currency_id = ?, is_active = ?, type = ?
          WHERE id = ?
        `,
        [nextName, nextCurrencyId, nextActive, nextType, id]
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError("Account name already exists", 400);
      }

      throw err;
    }

    return getAccountById(id);
  });
}