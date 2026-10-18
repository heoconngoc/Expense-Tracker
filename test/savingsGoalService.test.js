import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  getContributions,
  getGoalById,
  getGoals,
  updateGoal,
} from "../src/services/savingsGoalService.js";

import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("createGoal", () => {
  test("creates a goal with progress fields", async () => {
    const goal = await createGoal({
      name: "Emergency Fund",
      targetAmount: 10000000,
      currencyId: 2,
    });

    expect(goal.name).toBe("Emergency Fund");
    expect(goal.totalContributed).toBe(0);
    expect(goal.remaining).toBe(10000000);
    expect(goal.progress).toBe(0);
  });

  test("rejects a missing name", async () => {
    await expect(
      createGoal({
        name: "   ",
        targetAmount: 100,
        currencyId: 2,
      })
    ).rejects.toThrow("Name is required");
  });

  test("rejects a non-positive target", async () => {
    await expect(
      createGoal({
        name: "Trip",
        targetAmount: 0,
        currencyId: 2,
      })
    ).rejects.toThrow(
      "targetAmount must be a positive integer"
    );
  });

  test("rejects an unknown currency", async () => {
    await expect(
      createGoal({
        name: "Trip",
        targetAmount: 100,
        currencyId: 999,
      })
    ).rejects.toThrow("Currency not found or inactive");
  });
});

describe("contributions", () => {
  test("adds up contributions and reports progress", async () => {
    const goal = await createGoal({
      name: "Laptop",
      targetAmount: 1000,
      currencyId: 1,
    });

    await addContribution(goal.id, { amount: 400 });
    await addContribution(goal.id, { amount: 250 });

    const updated = await getGoalById(goal.id);

    expect(updated.totalContributed).toBe(650);
    expect(updated.remaining).toBe(350);
    expect(updated.progress).toBeCloseTo(0.65);
  });

  test("lists contributions for a goal", async () => {
    const goal = await createGoal({
      name: "Laptop",
      targetAmount: 1000,
      currencyId: 1,
    });

    await addContribution(goal.id, {
      amount: 400,
      note: "First",
    });

    const contributions = await getContributions(goal.id);

    expect(contributions).toHaveLength(1);
    expect(contributions[0].note).toBe("First");
  });

  test("deletes a contribution", async () => {
    const goal = await createGoal({
      name: "Laptop",
      targetAmount: 1000,
      currencyId: 1,
    });
    const contribution = await addContribution(goal.id, {
      amount: 400,
    });

    await deleteContribution(contribution.id);

    expect(await getContributions(goal.id)).toHaveLength(0);
  });

  test("rejects a non-positive contribution", async () => {
    const goal = await createGoal({
      name: "Laptop",
      targetAmount: 1000,
      currencyId: 1,
    });

    await expect(
      addContribution(goal.id, { amount: 0 })
    ).rejects.toThrow(
      "amount must be a positive integer"
    );
  });

  test("rejects a contribution to a missing goal", async () => {
    await expect(
      addContribution(999, { amount: 100 })
    ).rejects.toThrow("Savings goal not found");
  });
});

describe("updateGoal and deleteGoal", () => {
  test("archives a goal and hides it by default", async () => {
    const goal = await createGoal({
      name: "Old Goal",
      targetAmount: 1000,
      currencyId: 1,
    });

    await updateGoal(goal.id, { isArchived: true });

    expect(await getGoals()).toHaveLength(0);
    expect(
      await getGoals({ includeArchived: true })
    ).toHaveLength(1);
  });

  test("deletes a goal", async () => {
    const goal = await createGoal({
      name: "Temp",
      targetAmount: 1000,
      currencyId: 1,
    });

    await deleteGoal(goal.id);

    expect(await getGoals()).toHaveLength(0);
  });

  test("throws when updating a missing goal", async () => {
    await expect(
      updateGoal(999, { name: "Nope" })
    ).rejects.toThrow("Savings goal not found");
  });
});
