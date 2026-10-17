import { all, get, run } from "../database.js";
import AppError from "../errors/AppError.js";

const QUANTITY_SCALE = 1000;
const CHI_PER_LUONG = 10;

const UNITS = ["chi", "luong"];

export function holdingValueVnd({
  quantityMilli,
  unit,
  priceVndPerLuong,
}) {
  const milliChi =
    unit === "luong"
      ? quantityMilli * CHI_PER_LUONG
      : quantityMilli;

  return Math.round(
    (priceVndPerLuong * milliChi) /
      (QUANTITY_SCALE * CHI_PER_LUONG)
  );
}

function assertQuantity(quantity) {
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new AppError(
      "quantity must be a positive number",
      400
    );
  }
}

function assertUnit(unit) {
  if (!UNITS.includes(unit)) {
    throw new AppError(
      "unit must be chi or luong",
      400
    );
  }
}

async function assertGoldAccount(accountId) {
  const account = await get(
    "SELECT id, type, is_active FROM accounts WHERE id = ?",
    [accountId]
  );

  if (!account || account.is_active !== 1) {
    throw new AppError(
      "Account not found or inactive",
      400
    );
  }

  if (account.type !== "gold") {
    throw new AppError(
      "Account must be a gold account",
      400
    );
  }

  return account;
}

function mapHolding(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.accountName,
    quantityMilli: row.quantity,
    quantity: row.quantity / QUANTITY_SCALE,
    unit: row.unit,
    note: row.note,
    createdAt: row.created_at,
  };
}

const HOLDING_SELECT = `
  SELECT
    g.*,
    a.name AS accountName
  FROM gold_holdings g
  JOIN accounts a ON a.id = g.account_id
`;

export async function getHoldings({ accountId } = {}) {
  let sql = HOLDING_SELECT;
  const params = [];

  if (accountId) {
    sql += " WHERE g.account_id = ?";
    params.push(accountId);
  }

  sql += " ORDER BY g.id";

  const rows = await all(sql, params);

  return rows.map(mapHolding);
}

export async function getHoldingById(id) {
  const row = await get(
    `${HOLDING_SELECT} WHERE g.id = ?`,
    [id]
  );

  return mapHolding(row);
}

export async function createHolding({
  accountId,
  quantity,
  unit,
  note = null,
}) {
  assertQuantity(quantity);
  assertUnit(unit);
  await assertGoldAccount(accountId);

  const result = await run(
    `
      INSERT INTO gold_holdings (account_id, quantity, unit, note)
      VALUES (?, ?, ?, ?)
    `,
    [
      accountId,
      Math.round(quantity * QUANTITY_SCALE),
      unit,
      note,
    ]
  );

  return getHoldingById(result.lastID);
}

export async function updateHolding(
  id,
  { quantity, unit, note = null }
) {
  assertQuantity(quantity);
  assertUnit(unit);

  const existing = await get(
    "SELECT id FROM gold_holdings WHERE id = ?",
    [id]
  );

  if (!existing) {
    throw new AppError("Gold holding not found", 404);
  }

  await run(
    `
      UPDATE gold_holdings
      SET quantity = ?, unit = ?, note = ?
      WHERE id = ?
    `,
    [
      Math.round(quantity * QUANTITY_SCALE),
      unit,
      note,
      id,
    ]
  );

  return getHoldingById(id);
}

export async function deleteHolding(id) {
  const result = await run(
    "DELETE FROM gold_holdings WHERE id = ?",
    [id]
  );

  if (result.changes === 0) {
    throw new AppError("Gold holding not found", 404);
  }
}
