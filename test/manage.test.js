import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import request from "supertest";

import app from "../src/app.js";
import { resetDatabase } from "./setup.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("Account management", () => {
  test("POST /accounts creates an account with an opening balance", async () => {
    const response = await request(app)
      .post("/accounts")
      .send({
        name: "Savings",
        currencyId: 1,
        initialBalance: 25000,
      });

    expect(response.status).toBe(201);
    expect(response.body.balance).toBe(25000);
    expect(response.body.currencyId).toBe(1);
    expect(response.body.isActive).toBe(1);
    expect(response.body.decimalPlaces).toBe(2);
  });

  test("POST /accounts creates an account with a zero balance", async () => {
    const response = await request(app)
      .post("/accounts")
      .send({
        name: "Cash Wallet",
        currencyId: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.balance).toBe(0);
  });

  test("POST /accounts returns 400 for a duplicate name", async () => {
    const response = await request(app)
      .post("/accounts")
      .send({
        name: "BofA Debit Card",
        currencyId: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Account name already exists"
    );
  });

  test("POST /accounts returns 400 for a non-integer balance", async () => {
    const response = await request(app)
      .post("/accounts")
      .send({
        name: "Bad Account",
        currencyId: 1,
        initialBalance: 12.5,
      });

    expect(response.status).toBe(400);
  });

  test("PUT /accounts/:id renames an account", async () => {
    const response = await request(app)
      .put("/accounts/1")
      .send({ name: "BofA Checking", isActive: true });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("BofA Checking");
  });

  test("PUT /accounts/:id archives an account", async () => {
    await request(app)
      .put("/accounts/1")
      .send({ isActive: false });

    const active = await request(app).get("/accounts?active=1");
    const all = await request(app).get("/accounts");

    expect(
      active.body.find((account) => account.id === 1)
    ).toBeUndefined();

    expect(
      all.body.find((account) => account.id === 1)
    ).toBeDefined();
  });

  test("PUT /accounts/:id rejects a currency change once an account has history", async () => {
    // Account 1 owns transactions and transfers in the seed.
    const response = await request(app)
      .put("/accounts/1")
      .send({ currencyId: 2 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Cannot change the currency of an account that already has history"
    );
  });

  test("PUT /accounts/:id returns 404 for a missing account", async () => {
    const response = await request(app)
      .put("/accounts/999999")
      .send({ name: "Nowhere" });

    expect(response.status).toBe(404);
  });
});

describe("Category management", () => {
  test("POST /categories creates a category", async () => {
    const response = await request(app)
      .post("/categories")
      .send({ name: "Shopping" });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Shopping");
  });

  test("POST /categories returns 400 for a duplicate name", async () => {
    const response = await request(app)
      .post("/categories")
      .send({ name: "Food" });

    expect(response.status).toBe(400);
  });

  test("PUT /categories/:id renames a category", async () => {
    const response = await request(app)
      .put("/categories/1")
      .send({ name: "Groceries" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Groceries");
  });

  test("PUT /categories/:id archives a category", async () => {
    await request(app)
      .put("/categories/1")
      .send({ isActive: false });

    const active = await request(app).get("/categories");
    const all = await request(app).get("/categories?all=1");

    expect(
      active.body.find((category) => category.id === 1)
    ).toBeUndefined();

    expect(
      all.body.find((category) => category.id === 1)
    ).toBeDefined();
  });
});

describe("Currency management", () => {
  test("POST /currencies creates a currency", async () => {
    const response = await request(app)
      .post("/currencies")
      .send({
        code: "eur",
        name: "Euro",
        symbol: "€",
        decimalPlaces: 2,
      });

    expect(response.status).toBe(201);
    expect(response.body.code).toBe("EUR");
  });

  test("POST /currencies returns 400 for a duplicate code", async () => {
    const response = await request(app)
      .post("/currencies")
      .send({
        code: "USD",
        name: "US Dollar",
        symbol: "$",
      });

    expect(response.status).toBe(400);
  });

  test("POST /currencies returns 400 for an invalid code", async () => {
    const response = await request(app)
      .post("/currencies")
      .send({
        code: "I NVALID",
        name: "Test",
        symbol: "T",
      });

    expect(response.status).toBe(400);
  });

  test("PUT /currencies/:id renames a currency", async () => {
    const response = await request(app)
      .put("/currencies/1")
      .send({ name: "US Dollars", symbol: "$" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("US Dollars");
    expect(response.body.decimalPlaces).toBe(2);
  });
});

describe("Dashboard per account", () => {
  test("GET /dashboard with accountId scopes totals to that account", async () => {
    const accountThree = await request(app).get(
      "/dashboard?start=2026-10-01&end=2026-11-01&currency=USD&accountId=3"
    );

    // Account 3 (USD cash) only has Coffee and Museum Ticket in October.
    expect(accountThree.status).toBe(200);
    expect(accountThree.body.totalIncome).toBe(0);
    expect(accountThree.body.totalExpense).toBe(2550);
    expect(accountThree.body.accountId).toBe(3);

    const accountOne = await request(app).get(
      "/dashboard?start=2026-10-01&end=2026-11-01&currency=USD&accountId=1"
    );

    expect(accountOne.body.totalIncome).toBe(120000);
    expect(accountOne.body.totalExpense).toBe(11024);
  });

  test("GET /dashboard returns 400 for a missing account", async () => {
    const response = await request(app).get(
      "/dashboard?start=2026-10-01&end=2026-11-01&currency=USD&accountId=999999"
    );

    expect(response.status).toBe(400);
  });
});