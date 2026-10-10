import { all, get, run } from "../database.js";
import AppError from "../errors/AppError.js";

function isUniqueViolation(err) {
  const code = err?.code ?? "";
  const isConstraint = code === "SQLITE_CONSTRAINT_UNIQUE";

  const isGenericUnique =
    code === "SQLITE_CONSTRAINT" &&
    /UNIQUE/i.test(err?.message ?? "");

  return isConstraint || isGenericUnique;
}

async function getCurrencyById(id) {
  return get(
    `
      SELECT
        id,
        code,
        currency_name AS name,
        symbol,
        decimal_places AS decimalPlaces,
        is_active AS isActive
      FROM currencies
      WHERE id = ?
    `,
    [id]
  );
}

export async function getCurrencies({
  activeOnly = false,
  all: includeAll = false,
} = {}) {
  let sql = `
    SELECT
      id,
      code,
      currency_name AS name,
      symbol,
      decimal_places AS decimalPlaces,
      is_active AS isActive
    FROM currencies
  `;

  if (activeOnly && !includeAll) {
    sql += " WHERE is_active = 1";
  }

  sql += " ORDER BY id";

  return all(sql);
}

export async function createCurrency({
  code,
  name,
  symbol,
  decimalPlaces = 2,
}) {
  const normalizedCode = (code ?? "").trim().toUpperCase();

  if (!/^[A-Z]{2,5}$/.test(normalizedCode)) {
    throw new AppError("Code must be 2-5 letters", 400);
  }

  if (!name?.trim()) {
    throw new AppError("Name is required", 400);
  }

  if (!symbol?.trim()) {
    throw new AppError("Symbol is required", 400);
  }

  if (
    !Number.isInteger(decimalPlaces) ||
    decimalPlaces < 0 ||
    decimalPlaces > 4
  ) {
    throw new AppError(
      "decimalPlaces must be an integer between 0 and 4",
      400
    );
  }

  try {
    const result = await run(
      `
        INSERT INTO currencies
          (code, currency_name, symbol, decimal_places)
        VALUES (?, ?, ?, ?)
      `,
      [
        normalizedCode,
        name.trim(),
        symbol.trim(),
        decimalPlaces,
      ]
    );

    return getCurrencyById(result.lastID);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError("Currency code already exists", 400);
    }

    throw err;
  }
}

export async function updateCurrency(id, { name, symbol, isActive }) {
  const currency = await get(
    "SELECT * FROM currencies WHERE id = ?",
    [id]
  );

  if (!currency) {
    throw new AppError("Currency not found", 404);
  }

  const nextName = name?.trim() || currency.currency_name;
  const nextSymbol = symbol?.trim() || currency.symbol;
  const nextActive =
    isActive === undefined
      ? currency.is_active
      : isActive
        ? 1
        : 0;

  // Code and decimal_places are intentionally not editable: balances
  // already use them as their unit, so changing them would corrupt money.

  await run(
    `
      UPDATE currencies
      SET currency_name = ?, symbol = ?, is_active = ?
      WHERE id = ?
    `,
    [nextName, nextSymbol, nextActive, id]
  );

  return getCurrencyById(id);
}