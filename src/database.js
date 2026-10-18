import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";

const DB_PATH = process.env.DB_PATH || "database/expense.db";

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "../database/schema.sql");
const REFERENCE_SEED_PATH = path.join(
  __dirname,
  "../database/seed-reference.sql"
);
const SAMPLE_SEED_PATH = path.join(
  __dirname,
  "../database/seed.sql"
);
const MIGRATIONS_DIR = path.join(
  __dirname,
  "../database/migrations"
);
const BACKUP_DIR =
  process.env.BACKUP_DIR ||
  path.join(__dirname, "../database/backups");

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

export async function initializeDatabase() {
  const row = await get(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'accounts'
    `
  );

  if (row) {
    return false;
  }

  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  const seedPath = process.env.SEED_SAMPLE
    ? SAMPLE_SEED_PATH
    : REFERENCE_SEED_PATH;
  const seed = fs.readFileSync(seedPath, "utf8");

  await exec(schema);
  await exec(seed);

  return true;
}

async function tableExists(name) {
  const row = await get(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `,
    [name]
  );

  return Boolean(row);
}

async function backupDatabase(version) {
  if (DB_PATH === ":memory:" || !fs.existsSync(DB_PATH)) {
    return null;
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  await exec("PRAGMA wal_checkpoint(FULL);");

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
  const destination = path.join(
    BACKUP_DIR,
    `expense-${stamp}-pre-${version}.db`
  );

  fs.copyFileSync(DB_PATH, destination);

  return destination;
}

/**
 * Apply every migration that has not been recorded yet.
 *
 * On a fresh install the schema is already current, so the
 * migrations are marked as applied without running them. On an
 * existing database the first run is "baselined": migration 001
 * was applied by hand before this runner existed, so it is marked
 * as applied and any later migration runs normally.
 */
export async function runMigrations({ freshInstall = false } = {}) {
  await exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = await all(
    "SELECT version FROM schema_migrations"
  );
  const applied = new Set(
    appliedRows.map((row) => row.version)
  );

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (freshInstall) {
    for (const file of files) {
      const version = file.split("_")[0];

      if (!applied.has(version)) {
        await run(
          "INSERT INTO schema_migrations (version) VALUES (?)",
          [version]
        );
      }
    }

    return [];
  }

  if (applied.size === 0 && (await tableExists("accounts"))) {
    await run(
      "INSERT INTO schema_migrations (version) VALUES (?)",
      ["001"]
    );
    applied.add("001");
  }

  const appliedNow = [];

  for (const file of files) {
    const version = file.split("_")[0];

    if (applied.has(version)) {
      continue;
    }

    const backup = await backupDatabase(version);
    const migration = fs.readFileSync(
      path.join(MIGRATIONS_DIR, file),
      "utf8"
    );

    await exec(migration);
    await run(
      "INSERT INTO schema_migrations (version) VALUES (?)",
      [version]
    );

    appliedNow.push(version);

    if (backup) {
      console.log(`Migration ${version} applied. Backup: ${backup}`);
    } else {
      console.log(`Migration ${version} applied.`);
    }
  }

  return appliedNow;
}

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