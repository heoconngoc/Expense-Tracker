import express from "express";
import {
  getTransfers,
  getTransferById,
  createTransfer,
  completeTransfer,
} from "../services/transferService.js";
import AppError from "../errors/AppError.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;

    if (status && !["pending", "completed"].includes(status)) {
      throw new AppError(
        "status must be pending or completed",
        400
      );
    }

    const transfers = await getTransfers({ status });

    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const transfer = await getTransferById(req.params.id);

    if (!transfer) {
      throw new AppError("Transfer not found", 404);
    }

    res.json(transfer);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const transfer = await createTransfer(req.body);

    res.status(201).json(transfer);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { receivedAmount, receivedDate } = req.body;

    const transfer = await completeTransfer(req.params.id, {
      receivedAmount,
      receivedDate,
    });

    res.json(transfer);
  } catch (err) {
    next(err);
  }
});

export default router;
