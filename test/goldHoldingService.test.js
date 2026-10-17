import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import { run } from "../src/database.js";

import {
  createHolding,
  deleteHolding,
  getHoldings,
  holdingValueVnd,
  updateHolding,
} from "../src/services/goldHoldingService.js";

import { resetDatabase } from "./setup.js";

async function createGoldAccount() {
  const result = await run(
    `
      INSERT INTO accounts (name, currency_id, balance, type)
      VALUES ('SJC Gold', 2, 0, 'gold')
    `
  );

  return result.lastID;
}

beforeEach(async () => {
  await resetDatabase();
});

describe("holdingValueVnd", () => {
  test("values one luong at the price per luong", () => {
    const value = holdingValueVnd({
      quantityMilli: 1000,
      unit: "luong",
      priceVndPerLuong: 140600000,
    });

    expect(value).toBe(140600000);
  });

  test("values one chi at a tenth of the price per luong", () => {
    const value = holdingValueVnd({
      quantityMilli: 1000,
      unit: "chi",
      priceVndPerLuong: 140600000,
    });

    expect(value).toBe(14060000);
  });

  test("values a fractional amount exactly", () => {
    const value = holdingValueVnd({
      quantityMilli: 1500,
      unit: "luong",
      priceVndPerLuong: 140600000,
    });

    expect(value).toBe(210900000);
  });
});

describe("createHolding", () => {
  test("stores the quantity in thousandths", async () => {
    const accountId = await createGoldAccount();

    const holding = await createHolding({
      accountId,
      quantity: 1.5,
      unit: "luong",
    });

    expect(holding.quantity).toBe(1.5);
    expect(holding.quantityMilli).toBe(1500);
    expect(holding.accountId).toBe(accountId);
  });

  test("rejects a non-gold account", async () => {
    await expect(
      createHolding({
        accountId: 1,
        quantity: 1,
        unit: "chi",
      })
    ).rejects.toThrow("Account must be a gold account");
  });

  test("rejects an invalid unit", async () => {
    const accountId = await createGoldAccount();

    await expect(
      createHolding({
        accountId,
        quantity: 1,
        unit: "kg",
      })
    ).rejects.toThrow("unit must be chi or luong");
  });

  test("rejects a non-positive quantity", async () => {
    const accountId = await createGoldAccount();

    await expect(
      createHolding({
        accountId,
        quantity: 0,
        unit: "chi",
      })
    ).rejects.toThrow("quantity must be a positive number");
  });
});

describe("updateHolding and deleteHolding", () => {
  test("updates a holding quantity", async () => {
    const accountId = await createGoldAccount();
    const holding = await createHolding({
      accountId,
      quantity: 1,
      unit: "chi",
    });

    const updated = await updateHolding(holding.id, {
      quantity: 2,
      unit: "luong",
    });

    expect(updated.quantity).toBe(2);
    expect(updated.unit).toBe("luong");
  });

  test("deletes a holding", async () => {
    const accountId = await createGoldAccount();
    const holding = await createHolding({
      accountId,
      quantity: 1,
      unit: "chi",
    });

    await deleteHolding(holding.id);

    expect(await getHoldings()).toHaveLength(0);
  });

  test("throws when updating a missing holding", async () => {
    await expect(
      updateHolding(999, { quantity: 1, unit: "chi" })
    ).rejects.toThrow("Gold holding not found");
  });
});
