import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
} from "../services/categoryService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const categories = await getCategories({
      all: req.query.all === "1",
    });

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const category = await createCategory(req.body);

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const category = await updateCategory(
      Number(req.params.id),
      req.body
    );

    res.json(category);
  } catch (err) {
    next(err);
  }
});

export default router;