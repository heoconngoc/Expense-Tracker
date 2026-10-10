import express from "express";

import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from "../services/transactionService.js";

const router = express.Router();


// GET /transactions
router.get("/", async (req, res, next) => {
  try {
    const transactions = await getTransactions({
      type: req.query.type,
      categoryId: req.query.categoryId,
      accountId: req.query.accountId,
      start: req.query.start,
      end: req.query.end,
    });

    res.json(transactions);
  } catch (err) {
    next(err);
  }
});


// GET /transactions/:id
router.get("/:id", async (req, res, next) => {
  try {
    const transaction = await getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        error: "Transaction not found",
      });
    }

    res.json(transaction);
  } catch (err) {
    next(err);
  }
});


// POST /transactions
router.post("/", async (req, res, next) => {
  try {
    const transaction = await createTransaction(req.body);

    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});


// PUT /transactions/:id
router.put("/:id", async (req, res, next) => {
  try {
    const transaction = await updateTransaction(req.params.id, req.body);

    res.json(transaction);
  } catch (err) {
    next(err);
  }
});


// DELETE /transactions/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await deleteTransaction(req.params.id);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});


export default router;