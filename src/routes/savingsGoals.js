import express from "express";
import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  getContributions,
  getGoalById,
  getGoals,
  updateGoal,
} from "../services/savingsGoalService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const includeArchived =
      req.query.includeArchived === "1" ||
      req.query.includeArchived === "true";

    const goals = await getGoals({ includeArchived });

    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const goal = await createGoal({
      name: req.body.name,
      targetAmount: req.body.targetAmount,
      currencyId: Number(req.body.currencyId),
      deadline: req.body.deadline ?? null,
    });

    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const goal = await getGoalById(Number(req.params.id));

    if (!goal) {
      return res
        .status(404)
        .json({ error: "Savings goal not found" });
    }

    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const goal = await updateGoal(Number(req.params.id), {
      name: req.body.name,
      targetAmount: req.body.targetAmount,
      currencyId: req.body.currencyId,
      deadline: req.body.deadline,
      isArchived: req.body.isArchived,
    });

    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await deleteGoal(Number(req.params.id));

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get("/:id/contributions", async (req, res, next) => {
  try {
    const contributions = await getContributions(
      Number(req.params.id)
    );

    res.json(contributions);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/contributions", async (req, res, next) => {
  try {
    const contribution = await addContribution(
      Number(req.params.id),
      {
        amount: req.body.amount,
        note: req.body.note ?? null,
        contributedAt: req.body.contributedAt ?? null,
      }
    );

    res.status(201).json(contribution);
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/contributions/:id",
  async (req, res, next) => {
    try {
      await deleteContribution(Number(req.params.id));

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
