import sqlite3 from "sqlite3";

const DB_PATH = process.env.DB_PATH || "database/expense.db";
const db = new sqlite3.Database(DB_PATH);

db.exec(
  `
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `,
  (err) => {
    if (err) {
      console.error("Failed to configure database:", err);
    }
  }
);

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

export function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

export async function withTransaction(callback) {
  await run("BEGIN IMMEDIATE");

  try {
    const result = await callback();
    await run("COMMIT");

    return result;
  } catch (err) {
    await run("ROLLBACK").catch(() => {});
    throw err;
  }
}

export default db;
