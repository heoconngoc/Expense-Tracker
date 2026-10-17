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

describe("Settings API", () => {
  test("GET /settings returns the base currency and empty gold price", async () => {
    const response = await request(app).get("/settings");

    expect(response.status).toBe(200);
    expect(
      response.body.manualGoldPriceVndPerLuong
    ).toBeNull();
  });

  test("PUT /settings/gold-price stores a manual price", async () => {
    const response = await request(app)
      .put("/settings/gold-price")
      .send({ price: 150000000 });

    expect(response.status).toBe(200);
    expect(
      response.body.manualGoldPriceVndPerLuong
    ).toBe(150000000);
  });

  test("PUT /settings/gold-price rejects a non-positive price", async () => {
    const response = await request(app)
      .put("/settings/gold-price")
      .send({ price: -1 });

    expect(response.status).toBe(400);
  });

  test("DELETE /settings/gold-price clears the manual price", async () => {
    await request(app)
      .put("/settings/gold-price")
      .send({ price: 150000000 });

    const response = await request(app).delete(
      "/settings/gold-price"
    );

    expect(response.status).toBe(200);
    expect(
      response.body.manualGoldPriceVndPerLuong
    ).toBeNull();
  });
});
