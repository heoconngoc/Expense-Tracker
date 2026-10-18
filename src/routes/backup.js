import express from "express";
import { exportData, importData } from "../services/backupService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const backup = await exportData();

    res.json(backup);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    await importData(req.body);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
