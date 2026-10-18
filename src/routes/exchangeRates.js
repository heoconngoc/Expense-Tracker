import express from "express";
import {
  fetchRates,
  getRates,
  setRate,
} from "../services/exchangeRateService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const rates = await getRates();

    res.json(rates);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const rates = await fetchRates();

    res.json(rates);
  } catch (err) {
    next(err);
  }
});

router.put("/:currencyId", async (req, res, next) => {
  try {
    const rate = await setRate({
      currencyId: Number(req.params.currencyId),
      rateToVnd: req.body.rateToVnd,
    });

    res.json(rate);
  } catch (err) {
    next(err);
  }
});

export default router;
