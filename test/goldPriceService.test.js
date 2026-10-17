import {
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";

import {
  GOLD_PRICE_URL,
  fetchGoldPrice,
  getCurrentGoldPrice,
  parseGoldPricePayload,
  resetGoldPriceCache,
} from "../src/services/goldPriceService.js";

import {
  getSettings,
  setCachedGoldPrice,
  setManualGoldPrice,
} from "../src/services/settingsService.js";

import { resetDatabase } from "./setup.js";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

const PRICE_PAYLOAD = {
  success: true,
  type: "SJL1L10",
  name: "SJC 9999",
  buy: 140600000,
  sell: 143600000,
};

beforeEach(async () => {
  await resetDatabase();
  resetGoldPriceCache();
});

describe("parseGoldPricePayload", () => {
  test("uses the buy price to value owned gold", () => {
    const parsed = parseGoldPricePayload(PRICE_PAYLOAD);

    expect(parsed.price).toBe(140600000);
    expect(parsed.buyPrice).toBe(140600000);
    expect(parsed.sellPrice).toBe(143600000);
  });

  test("falls back to the sell price when buy is missing", () => {
    const parsed = parseGoldPricePayload({
      success: true,
      sell: 143600000,
    });

    expect(parsed.price).toBe(143600000);
    expect(parsed.buyPrice).toBeNull();
  });

  test("throws when no price is present", () => {
    expect(() =>
      parseGoldPricePayload({ success: true })
    ).toThrow("Gold price missing from response");
  });
});

describe("fetchGoldPrice", () => {
  test("requests the SJC 9999 endpoint and parses the response", async () => {
    let requestedUrl;

    const price = await fetchGoldPrice({
      fetchImpl: async (url) => {
        requestedUrl = url;

        return jsonResponse(PRICE_PAYLOAD);
      },
    });

    expect(requestedUrl).toBe(GOLD_PRICE_URL);
    expect(price.price).toBe(140600000);
  });

  test("throws when the API responds with an error status", async () => {
    await expect(
      fetchGoldPrice({
        fetchImpl: async () =>
          jsonResponse(null, { ok: false, status: 500 }),
      })
    ).rejects.toThrow("Gold price API returned 500");
  });
});

describe("getCurrentGoldPrice", () => {
  test("returns the API price and stores it as a cache", async () => {
    const result = await getCurrentGoldPrice({
      fetchImpl: async () => jsonResponse(PRICE_PAYLOAD),
    });

    expect(result.source).toBe("giavang.now");
    expect(result.price).toBe(140600000);

    const settings = await getSettings();

    expect(settings.cachedGoldPriceVndPerLuong).toBe(
      140600000
    );
    expect(settings.cachedGoldPriceSource).toBe(
      "giavang.now"
    );
  });

  test("serves the in-memory cache without calling the API again", async () => {
    let calls = 0;

    const fetchImpl = async () => {
      calls += 1;

      return jsonResponse(PRICE_PAYLOAD);
    };

    await getCurrentGoldPrice({ fetchImpl });
    await getCurrentGoldPrice({ fetchImpl });

    expect(calls).toBe(1);
  });

  test("falls back to the manual price when the API fails", async () => {
    await setManualGoldPrice(150000000);

    const result = await getCurrentGoldPrice({
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });

    expect(result.source).toBe("manual");
    expect(result.price).toBe(150000000);
  });

  test("falls back to the stored cache when the API fails", async () => {
    await setCachedGoldPrice({
      price: 138000000,
      source: "giavang.now",
      fetchedAt: "2026-10-01T00:00:00.000Z",
    });

    const result = await getCurrentGoldPrice({
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });

    expect(result.source).toBe("cache");
    expect(result.price).toBe(138000000);
  });

  test("throws when the API fails and no fallback exists", async () => {
    await expect(
      getCurrentGoldPrice({
        fetchImpl: async () => {
          throw new Error("network down");
        },
      })
    ).rejects.toThrow(
      "Gold price unavailable, please enter it manually"
    );
  });
});
