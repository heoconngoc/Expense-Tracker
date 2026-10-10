import express from "express";
import {
  createCurrency,
  getCurrencies,
  updateCurrency,
} from "../services/currencyService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const currencies = await getCurrencies({
      activeOnly: req.query.active === "1",
      all: req.query.all === "1",
    });

    res.json(currencies);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const currency = await createCurrency(req.body);

    res.status(201).json(currency);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const currency = await updateCurrency(
      Number(req.params.id),
      req.body
    );

    res.json(currency);
  } catch (err) {
    next(err);
  }
});

export default router;