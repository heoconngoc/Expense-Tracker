import express from "express";
import { getAccounts } from "../services/accountService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const accounts = await getAccounts();

    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

export default router;