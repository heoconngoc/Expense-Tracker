import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import request from "supertest";

import app from "../src/app.js";
import { run } from "../src/database.js";
import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("Transaction API", () => {
  test("POST /transactions returns 201", async () => {
    const response = await request(app)
      .post("/transactions")
      .send({
        name: "API Coffee",
        amount: 500,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("API Coffee");
  });

  test("POST /transactions returns 400 for invalid input", async () => {
    const response = await request(app)
      .post("/transactions")
      .send({
        name: "Bad Expense",
        amount: -10,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Amount must be greater than 0"
    );
  });

  test("POST /transactions returns 400 for a non-integer amount", async () => {
    const response = await request(app)
      .post("/transactions")
      .send({
        name: "Float Expense",
        amount: 6.75,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      });

    expect(response.status).toBe(400);
  });

  test("GET /transactions/:id returns camelCase reference ids", async () => {
    const created = await request(app)
      .post("/transactions")
      .send({
        name: "API Coffee",
        amount: 500,
        type: "expense",
        date: "2026-10-07",
        categoryId: 1,
        accountId: 1,
      });

    const response = await request(app).get(
      `/transactions/${created.body.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.categoryId).toBe(1);
    expect(response.body.accountId).toBe(1);
    expect(response.body.decimalPlaces).toBe(2);
  });

  test("GET /transactions/:id returns 404 when transaction does not exist", async () => {
    const response = await request(app)
      .get("/transactions/999999");

    expect(response.status).toBe(404);
  });

  test("returns JSON 404 for unknown route", async () => {
    const response = await request(app)
      .get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Route not found",
    });
  });
});

describe("Currency API", () => {
  test("GET /currencies returns decimalPlaces", async () => {
    const response = await request(app).get("/currencies");

    expect(response.status).toBe(200);

    const usd = response.body.find(
      (currency) => currency.code === "USD"
    );

    const vnd = response.body.find(
      (currency) => currency.code === "VND"
    );

    expect(usd.decimalPlaces).toBe(2);
    expect(vnd.decimalPlaces).toBe(0);
  });
});

describe("Account API", () => {
  test("GET /accounts?active=1 excludes archived accounts", async () => {
    await run(
      "UPDATE accounts SET is_active = 0 WHERE id = ?",
      [1]
    );

    const response = await request(app).get("/accounts?active=1");

    expect(response.status).toBe(200);
    expect(
      response.body.find((account) => account.id === 1)
    ).toBeUndefined();
  });

  test("GET /accounts includes archived accounts", async () => {
    await run(
      "UPDATE accounts SET is_active = 0 WHERE id = ?",
      [1]
    );

    const response = await request(app).get("/accounts");

    expect(
      response.body.find((account) => account.id === 1)
    ).toBeDefined();
  });
});

describe("Transfer API", () => {
  test("POST /transfers returns the created transfer", async () => {
    const response = await request(app)
      .post("/transfers")
      .send({
        sourceAccountId: 1,
        destinationAccountId: 3,
        sentAmount: 1000,
        receivedAmount: 1000,
        exchangeRate: 1,
        sentDate: "2026-10-07",
        receivedDate: "2026-10-07",
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.sentAmount).toBe(1000);
    expect(response.body.exchangeRate).toBe(1);
  });

  test("POST /transfers returns 400 for insufficient balance", async () => {
    const response = await request(app)
      .post("/transfers")
      .send({
        sourceAccountId: 1,
        destinationAccountId: 3,
        sentAmount: 999999999,
        receivedAmount: 1000,
        exchangeRate: 1,
        sentDate: "2026-10-07",
        receivedDate: "2026-10-07",
      });

    expect(response.status).toBe(400);
  });

  test("PATCH /transfers/:id completes a pending transfer", async () => {
    // The seed contains transfer id 3 as pending.
    const response = await request(app)
      .patch("/transfers/3")
      .send({
        receivedAmount: 1300000,
        receivedDate: "2026-10-07",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("completed");
  });

  test("PATCH /transfers/:id returns 404 for a missing transfer", async () => {
    const response = await request(app)
      .patch("/transfers/999999")
      .send({
        receivedAmount: 100,
        receivedDate: "2026-10-07",
      });

    expect(response.status).toBe(404);
  });
});

describe("Dashboard API", () => {
  test("GET /dashboard returns integer totals with decimalPlaces", async () => {
    const response = await request(app).get(
      "/dashboard?start=2026-10-01&end=2026-11-01&currency=USD"
    );

    expect(response.status).toBe(200);
    expect(response.body.decimalPlaces).toBe(2);
    expect(Number.isInteger(response.body.totalIncome)).toBe(true);
    expect(Number.isInteger(response.body.totalExpense)).toBe(true);
  });

  test("GET /dashboard returns 400 for an unknown currency", async () => {
    const response = await request(app).get(
      "/dashboard?start=2026-10-01&end=2026-11-01&currency=XYZ"
    );

    expect(response.status).toBe(400);
  });
});

describe("Chart.js vendor asset", () => {
  test("GET /vendor/chart.js serves the local Chart.js bundle", async () => {
    const response = await request(app).get("/vendor/chart.js");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Chart");
  });
});
