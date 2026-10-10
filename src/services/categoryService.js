import { all, get, run } from "../database.js";
import AppError from "../errors/AppError.js";

function isUniqueViolation(err) {
  const code = err?.code ?? "";
  const isConstraint = code === "SQLITE_CONSTRAINT_UNIQUE";

  const isGenericUnique =
    code === "SQLITE_CONSTRAINT" &&
    /UNIQUE/i.test(err?.message ?? "");

  return isConstraint || isGenericUnique;
}

async function getCategoryById(id) {
  return get(
    `
      SELECT id, name, is_active AS isActive
      FROM categories
      WHERE id = ?
    `,
    [id]
  );
}

export async function getCategories({ all: includeAll = false } = {}) {
  let sql = `
    SELECT id, name, is_active AS isActive
    FROM categories
  `;

  if (!includeAll) {
    sql += " WHERE is_active = 1";
  }

  sql += " ORDER BY name";

  return all(sql);
}

export async function createCategory({ name }) {
  if (!name?.trim()) {
    throw new AppError("Name is required", 400);
  }

  try {
    const result = await run(
      "INSERT INTO categories (name) VALUES (?)",
      [name.trim()]
    );

    return getCategoryById(result.lastID);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError("Category name already exists", 400);
    }

    throw err;
  }
}

export async function updateCategory(id, { name, isActive }) {
  const category = await get(
    "SELECT * FROM categories WHERE id = ?",
    [id]
  );

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const nextName = name?.trim() || category.name;
  const nextActive =
    isActive === undefined
      ? category.is_active
      : isActive
        ? 1
        : 0;

  try {
    await run(
      "UPDATE categories SET name = ?, is_active = ? WHERE id = ?",
      [nextName, nextActive, id]
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError("Category name already exists", 400);
    }

    throw err;
  }

  return getCategoryById(id);
}