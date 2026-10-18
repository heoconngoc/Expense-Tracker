import express from "express";
import {
  createHolding,
  deleteHolding,
  getHoldings,
  updateHolding,
} from "../services/goldHoldingService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const accountId = req.query.accountId
      ? Number(req.query.accountId)
      : undefined;

    const holdings = await getHoldings({ accountId });

    res.json(holdings);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const holding = await createHolding({
      accountId: Number(req.body.accountId),
      quantity: req.body.quantity,
      unit: req.body.unit,
      note: req.body.note ?? null,
    });

    res.status(201).json(holding);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const holding = await updateHolding(
      Number(req.params.id),
      {
        quantity: req.body.quantity,
        unit: req.body.unit,
        note: req.body.note ?? null,
      }
    );

    res.json(holding);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await deleteHolding(Number(req.params.id));

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
