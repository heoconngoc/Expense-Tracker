import express from "express";
import {
  clearManualGoldPrice,
  getSettings,
  setManualGoldPrice,
} from "../services/settingsService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const settings = await getSettings();

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put("/gold-price", async (req, res, next) => {
  try {
    const settings = await setManualGoldPrice(
      req.body.price
    );

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.delete("/gold-price", async (req, res, next) => {
  try {
    const settings = await clearManualGoldPrice();

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

export default router;
