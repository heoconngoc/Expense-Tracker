import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import {
  fetchRates,
  getRates,
  setRate,
} from "../src/services/exchangeRateService.js";

import { resetDatabase } from "./setup.js";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

const FX_PAYLOAD = {
  result: "success",
  base_code: "USD",
  rates: { USD: 1, VND: 26000 },
};

beforeEach(async () => {
  await resetDatabase();
});

describe("getRates", () => {
  test("returns the seeded rates in VND units", async () => {
    const rates = await getRates();
    const usd = rates.find((rate) => rate.code === "USD");
    const vnd = rates.find((rate) => rate.code === "VND");

    expect(usd.rateToVnd).toBe(26000);
    expect(vnd.rateToVnd).toBe(1);
  });
});

describe("setRate", () => {
  test("updates a currency rate and marks it manual", async () => {
    const rate = await setRate({
      currencyId: 1,
      rateToVnd: 27000,
    });

    expect(rate.rateToVnd).toBe(27000);
    expect(rate.source).toBe("manual");
  });

  test("throws for an unknown currency", async () => {
    await expect(
      setRate({ currencyId: 999, rateToVnd: 27000 })
    ).rejects.toThrow("Currency not found");
  });

  test("throws for a non-positive rate", async () => {
    await expect(
      setRate({ currencyId: 1, rateToVnd: 0 })
    ).rejects.toThrow(
      "rateToVnd must be a positive number"
    );
  });
});

describe("fetchRates", () => {
  test("converts the API rates to VND per unit", async () => {
    const updated = await fetchRates({
      fetchImpl: async () =>
        jsonResponse({
          result: "success",
          rates: { USD: 1, VND: 26000 },
        }),
    });

    const usd = updated.find((rate) => rate.code === "USD");

    expect(usd.rateToVnd).toBe(26000);

    const rates = await getRates();
    const usdStored = rates.find(
      (rate) => rate.code === "USD"
    );

    expect(usdStored.source).toBe("api");
    expect(usdStored.rateToVnd).toBe(26000);
  });

  test("throws when the API responds with an error status", async () => {
    await expect(
      fetchRates({
        fetchImpl: async () =>
          jsonResponse(null, { ok: false, status: 503 }),
      })
    ).rejects.toThrow("Exchange rate API returned 503");
  });

  test("throws when the payload is malformed", async () => {
    await expect(
      fetchRates({
        fetchImpl: async () =>
          jsonResponse({ result: "error" }),
      })
    ).rejects.toThrow(
      "Unexpected exchange rate response"
    );
  });
});
