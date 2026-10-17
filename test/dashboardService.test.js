import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import {
  getDashboard,
  recentMonths,
} from "../src/services/dashboardService.js";

import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("recentMonths", () => {
  test("returns the months before the end date, oldest first", () => {
    expect(recentMonths("2026-11-01", 3)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  test("crosses a year boundary", () => {
    expect(recentMonths("2026-02-01", 3)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });
});

describe("getDashboard monthly trend", () => {
  test("returns income and expense per month", async () => {
    const dashboard = await getDashboard({
      start: "2026-10-01",
      end: "2026-11-01",
      currency: "USD",
      months: 2,
    });

    expect(dashboard.monthly).toEqual([
      { month: "2026-09", income: 120000, expense: 11450 },
      { month: "2026-10", income: 120000, expense: 13574 },
    ]);
  });

  test("fills months with no transactions using zeros", async () => {
    const dashboard = await getDashboard({
      start: "2026-10-01",
      end: "2026-11-01",
      currency: "USD",
      months: 3,
    });

    expect(dashboard.monthly[0]).toEqual({
      month: "2026-08",
      income: 0,
      expense: 0,
    });
  });
});
