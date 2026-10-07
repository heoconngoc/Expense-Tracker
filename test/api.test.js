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

describe("Transaction API", () => {
  test("POST /transactions returns 201", async () => {
    const response = await request(app)
      .post("/transactions")
      .send({
        name: "API Coffee",
        amount: 5,
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

  test("GET /transactions/:id returns 404 when transaction does not exist", async () => {
    const response = await request(app)
      .get("/transactions/999999");

    expect(response.status).toBe(404);
  });
});