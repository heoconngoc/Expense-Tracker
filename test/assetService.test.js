import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import { get, run } from "../src/database.js";

import {
  convertMinorToVnd,
  getAssets,
} from "../src/services/assetService.js";

import { resetDatabase } from "./setup.js";

const GOLD_PRICE = {
  price: 140600000,
  source: "manual",
  fetchedAt: null,
};

async function createGoldAccountWithHolding() {
  const account = await run(
    `
      INSERT INTO accounts (name, currency_id, balance, type)
      VALUES ('SJC Gold', 2, 0, 'gold')
    `
  );

  const accountId = account.lastID;

  await run(
    `
      INSERT INTO gold_holdings (account_id, quantity, unit)
      VALUES (?, 1000, 'luong')
    `,
    [accountId]
  );

  return accountId;
}

beforeEach(async () => {
  await resetDatabase();
});

describe("convertMinorToVnd", () => {
  test("leaves VND unchanged", () => {
    expect(
      convertMinorToVnd({
        balance: 1000000,
        decimalPlaces: 0,
        rateToVndMicro: 1000000,
      })
    ).toBe(1000000);
  });

  test("converts USD cents to VND", () => {
    expect(
      convertMinorToVnd({
        balance: 100000,
        decimalPlaces: 2,
        rateToVndMicro: 26000000000,
      })
    ).toBe(26000000);
  });
});

describe("getAssets", () => {
  test("values every seeded account in VND", async () => {
    const assets = await getAssets({
      getGoldPrice: async () => GOLD_PRICE,
    });

    // BofA Debit Card: 100000 cents = $1000 -> 26,000,000
    // MB Debit Card: 10,000,000 VND -> 10,000,000
    // USD cash: 10000 cents = $100 -> 2,600,000
    // VND cash: 1,000,000 VND -> 1,000,000
    expect(assets.currency).toBe("VND");
    expect(assets.total).toBe(39600000);
    expect(assets.byType.spending).toBe(39600000);
  });

  test("adds the value of gold holdings", async () => {
    await createGoldAccountWithHolding();

    const assets = await getAssets({
      getGoldPrice: async () => GOLD_PRICE,
    });

    expect(assets.byType.gold).toBe(140600000);
    expect(assets.total).toBe(39600000 + 140600000);
    expect(assets.goldPrice.price).toBe(140600000);
  });

  test("does not fetch a gold price when there are no holdings", async () => {
    let called = false;

    const assets = await getAssets({
      getGoldPrice: async () => {
        called = true;

        return GOLD_PRICE;
      },
    });

    expect(called).toBe(false);
    expect(assets.goldPrice).toBeNull();
  });

  test("reports a missing exchange rate instead of failing", async () => {
    await run(
      "INSERT INTO currencies (code, currency_name, symbol, decimal_places) VALUES ('EUR', 'Euro', '€', 2)"
    );

    const currency = await get(
      "SELECT id FROM currencies WHERE code = 'EUR'"
    );

    await run(
      `
        INSERT INTO accounts (name, currency_id, balance, type)
        VALUES ('EUR Wallet', ?, 10000, 'spending')
      `,
      [currency.id]
    );

    const assets = await getAssets({
      getGoldPrice: async () => GOLD_PRICE,
    });

    const eur = assets.accounts.find(
      (account) => account.name === "EUR Wallet"
    );

    expect(eur.valueVnd).toBeNull();
    expect(assets.missingRates).toContain("EUR");
    expect(assets.total).toBe(39600000);
  });
});
