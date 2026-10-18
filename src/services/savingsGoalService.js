import { all, get, run } from "../database.js";
import AppError from "../errors/AppError.js";

function assertName(name) {
  if (!name?.trim()) {
    throw new AppError("Name is required", 400);
  }
}

function assertTargetAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError(
      "targetAmount must be a positive integer in the smallest unit",
      400
    );
  }
}

function assertContributionAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError(
      "amount must be a positive integer in the smallest unit",
      400
    );
  }
}

async function assertCurrencyActive(currencyId) {
  const currency = await get(
    "SELECT id FROM currencies WHERE id = ? AND is_active = 1",
    [currencyId]
  );

  if (!currency) {
    throw new AppError("Currency not found or inactive", 400);
  }
}

const GOAL_COLUMNS = `
  g.id,
  g.name,
  g.target_amount AS targetAmount,
  g.currency_id AS currencyId,
  c.code AS currency,
  c.symbol,
  c.decimal_places AS decimalPlaces,
  g.deadline,
  g.is_archived AS isArchived,
  g.created_at AS createdAt,
  COALESCE(SUM(sc.amount), 0) AS totalContributed
`;

function withProgress(goal) {
  const remaining = goal.targetAmount - goal.totalContributed;

  return {
    ...goal,
    remaining,
    progress:
      goal.targetAmount > 0
        ? goal.totalContributed / goal.targetAmount
        : 0,
  };
}

export async function getGoals({ includeArchived = false } = {}) {
  let sql = `
    SELECT ${GOAL_COLUMNS}
    FROM savings_goals g
    JOIN currencies c ON c.id = g.currency_id
    LEFT JOIN savings_contributions sc ON sc.goal_id = g.id
  `;

  if (!includeArchived) {
    sql += " WHERE g.is_archived = 0";
  }

  sql += " GROUP BY g.id ORDER BY g.is_archived, g.id";

  const goals = await all(sql);

  return goals.map(withProgress);
}

export async function getGoalById(id) {
  const goal = await get(
    `
      SELECT ${GOAL_COLUMNS}
      FROM savings_goals g
      JOIN currencies c ON c.id = g.currency_id
      LEFT JOIN savings_contributions sc ON sc.goal_id = g.id
      WHERE g.id = ?
      GROUP BY g.id
    `,
    [id]
  );

  return goal ? withProgress(goal) : null;
}

export async function createGoal({
  name,
  targetAmount,
  currencyId,
  deadline = null,
}) {
  assertName(name);
  assertTargetAmount(targetAmount);
  await assertCurrencyActive(currencyId);

  const result = await run(
    `
      INSERT INTO savings_goals (name, target_amount, currency_id, deadline)
      VALUES (?, ?, ?, ?)
    `,
    [name.trim(), targetAmount, currencyId, deadline]
  );

  return getGoalById(result.lastID);
}

export async function updateGoal(
  id,
  { name, targetAmount, currencyId, deadline, isArchived }
) {
  const goal = await get(
    "SELECT * FROM savings_goals WHERE id = ?",
    [id]
  );

  if (!goal) {
    throw new AppError("Savings goal not found", 404);
  }

  const nextName = name?.trim() || goal.name;
  const nextTargetAmount =
    targetAmount ?? goal.target_amount;
  const nextCurrencyId = currencyId ?? goal.currency_id;
  const nextDeadline =
    deadline === undefined ? goal.deadline : deadline;
  const nextArchived =
    isArchived === undefined
      ? goal.is_archived
      : isArchived
        ? 1
        : 0;

  assertTargetAmount(nextTargetAmount);

  if (nextCurrencyId !== goal.currency_id) {
    await assertCurrencyActive(nextCurrencyId);
  }

  await run(
    `
      UPDATE savings_goals
      SET
        name = ?,
        target_amount = ?,
        currency_id = ?,
        deadline = ?,
        is_archived = ?
      WHERE id = ?
    `,
    [
      nextName,
      nextTargetAmount,
      nextCurrencyId,
      nextDeadline,
      nextArchived,
      id,
    ]
  );

  return getGoalById(id);
}

export async function deleteGoal(id) {
  const result = await run(
    "DELETE FROM savings_goals WHERE id = ?",
    [id]
  );

  if (result.changes === 0) {
    throw new AppError("Savings goal not found", 404);
  }
}

export async function getContributions(goalId) {
  return all(
    `
      SELECT
        id,
        goal_id AS goalId,
        amount,
        note,
        contributed_at AS contributedAt
      FROM savings_contributions
      WHERE goal_id = ?
      ORDER BY contributed_at, id
    `,
    [goalId]
  );
}

export async function addContribution(
  goalId,
  { amount, note = null, contributedAt = null }
) {
  assertContributionAmount(amount);

  const goal = await get(
    "SELECT id FROM savings_goals WHERE id = ?",
    [goalId]
  );

  if (!goal) {
    throw new AppError("Savings goal not found", 404);
  }

  const result = await run(
    `
      INSERT INTO savings_contributions (goal_id, amount, note, contributed_at)
      VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `,
    [goalId, amount, note, contributedAt]
  );

  const contribution = await get(
    `
      SELECT
        id,
        goal_id AS goalId,
        amount,
        note,
        contributed_at AS contributedAt
      FROM savings_contributions
      WHERE id = ?
    `,
    [result.lastID]
  );

  return contribution;
}

export async function deleteContribution(id) {
  const result = await run(
    "DELETE FROM savings_contributions WHERE id = ?",
    [id]
  );

  if (result.changes === 0) {
    throw new AppError("Contribution not found", 404);
  }
}
