import express from "express";
import { getCurrencies } from "../services/currencyService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const currencies = await getCurrencies({
      activeOnly: req.query.active === "1",
    });

    res.json(currencies);
  } catch (err) {
    next(err);
  }
});

export default router;
