import express from "express";
import { getDashboard } from "../services/dashboardService.js";
import AppError from "../errors/AppError.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { start, end, currency } = req.query;

    if (!start || !end || !currency) {
      throw new AppError(
        "start, end, and currency are required",
        400
      );
    }

    const accountId = req.query.accountId
      ? Number(req.query.accountId)
      : undefined;

    const dashboard = await getDashboard({
      start,
      end,
      currency,
      accountId,
    });

    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

export default router;