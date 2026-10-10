import express from "express";
import { getAccounts } from "../services/accountService.js";

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

export default router;
