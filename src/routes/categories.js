import express from "express";
import { getCategories } from "../services/categoryService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const categories = await getCategories();

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

export default router;