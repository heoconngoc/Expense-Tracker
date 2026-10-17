import express from "express";
import { getCurrentGoldPrice } from "../services/goldPriceService.js";

const router = express.Router();

router.get("/current", async (req, res, next) => {
  try {
    const price = await getCurrentGoldPrice();

    res.json(price);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const price = await getCurrentGoldPrice({
      force: true,
    });

    res.json(price);
  } catch (err) {
    next(err);
  }
});

export default router;
