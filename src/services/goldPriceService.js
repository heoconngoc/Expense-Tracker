import AppError from "../errors/AppError.js";
import {
  getSettings,
  setCachedGoldPrice,
} from "./settingsService.js";

export const GOLD_PRICE_URL =
  "https://giavang.now/api/prices?type=SJL1L10";

export const GOLD_PRICE_TTL_MS = 30 * 60 * 1000;

export const GOLD_PRICE_SOURCES = {
  API: "giavang.now",
  MANUAL: "manual",
  CACHE: "cache",
};

let memoryCache = null;

export function resetGoldPriceCache() {
  memoryCache = null;
}

function toPrice(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return Math.round(value);
}

/**
 * The API quotes a buy price (what a shop pays you) and a sell price
 * (what a shop charges you). The buy price is the realisable value of
 * gold the user already owns, so it is used to value holdings.
 */
export function parseGoldPricePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new AppError(
      "Unexpected gold price response",
      502
    );
  }

  const buyPrice = toPrice(payload.buy);
  const sellPrice = toPrice(payload.sell);
  const price = buyPrice ?? sellPrice;

  if (!price) {
    throw new AppError(
      "Gold price missing from response",
      502
    );
  }

  return { price, buyPrice, sellPrice };
}

export async function fetchGoldPrice({
  fetchImpl = globalThis.fetch,
} = {}) {
  const response = await fetchImpl(GOLD_PRICE_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new AppError(
      `Gold price API returned ${response.status}`,
      502
    );
  }

  const payload = await response.json();

  return parseGoldPricePayload(payload);
}

export async function getCurrentGoldPrice({
  fetchImpl = globalThis.fetch,
  force = false,
} = {}) {
  const now = Date.now();

  if (
    !force &&
    memoryCache &&
    memoryCache.expiresAt > now
  ) {
    return { ...memoryCache.value };
  }

  try {
    const fetched = await fetchGoldPrice({ fetchImpl });
    const fetchedAt = new Date().toISOString();
    const value = {
      price: fetched.price,
      buyPrice: fetched.buyPrice,
      sellPrice: fetched.sellPrice,
      source: GOLD_PRICE_SOURCES.API,
      fetchedAt,
    };

    memoryCache = {
      value,
      expiresAt: now + GOLD_PRICE_TTL_MS,
    };

    await setCachedGoldPrice({
      price: fetched.price,
      source: GOLD_PRICE_SOURCES.API,
      fetchedAt,
    });

    return value;
  } catch {
    const settings = await getSettings();

    if (settings?.manualGoldPriceVndPerLuong) {
      return {
        price: settings.manualGoldPriceVndPerLuong,
        buyPrice: null,
        sellPrice: null,
        source: GOLD_PRICE_SOURCES.MANUAL,
        fetchedAt: null,
      };
    }

    if (settings?.cachedGoldPriceVndPerLuong) {
      return {
        price: settings.cachedGoldPriceVndPerLuong,
        buyPrice: null,
        sellPrice: null,
        source: GOLD_PRICE_SOURCES.CACHE,
        fetchedAt: settings.cachedGoldPriceFetchedAt,
      };
    }

    throw new AppError(
      "Gold price unavailable, please enter it manually",
      503
    );
  }
}
