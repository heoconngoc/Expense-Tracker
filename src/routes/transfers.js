import express from "express";
import { getTransfers, createTransfer, } from "../services/transferService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const transfers = await getTransfers();

    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const id = await createTransfer(req.body);

    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

export default router;