import express from "express";
import {
  createAccount,
  getAccounts,
  updateAccount,
} from "../services/accountService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const accounts = await getAccounts({
      activeOnly: req.query.active === "1",
    });

    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const account = await createAccount(req.body);

    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const account = await updateAccount(
      Number(req.params.id),
      req.body
    );

    res.json(account);
  } catch (err) {
    next(err);
  }
});

export default router;