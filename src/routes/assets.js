import express from "express";
import { getAssets } from "../services/assetService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const assets = await getAssets();

    res.json(assets);
  } catch (err) {
    next(err);
  }
});

export default router;
