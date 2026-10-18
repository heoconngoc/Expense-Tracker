import { all, run, withTransaction } from "../database.js";
import AppError from "../errors/AppError.js";

const TABLES = [
  {
    name: "currencies",
    columns: [
      "id",
      "code",
      "currency_name",
      "symbol",
      "decimal_places",
      "is_active",
    ],
  },
  { name: "categories", columns: ["id", "name", "is_active"] },
  {
    name: "accounts",
    columns: [
      "id",
      "name",
      "currency_id",
      "balance",
      "type",
      "is_active",
    ],
  },
  {
    name: "transactions",
    columns: [
      "id",
      "name",
      "amount",
      "type",
      "date",
      "notes",
      "category_id",
      "account_id",
    ],
  },
  {
    name: "transfers",
    columns: [
      "id",
      "source_account_id",
      "destination_account_id",
      "sent_amount",
      "received_amount",
      "exchange_rate",
      "status",
      "sent_date",
      "received_date",
    ],
  },
  {
    name: "gold_holdings",
    columns: [
      "id",
      "account_id",
      "quantity",
      "unit",
      "note",
      "created_at",
    ],
  },
  {
    name: "savings_goals",
    columns: [
      "id",
      "name",
      "target_amount",
      "currency_id",
      "deadline",
      "is_archived",
      "created_at",
    ],
  },
  {
    name: "savings_contributions",
    columns: ["id", "goal_id", "amount", "note", "contributed_at"],
  },
  {
    name: "exchange_rates",
    columns: [
      "id",
      "currency_id",
      "rate_to_vnd",
      "source",
      "updated_at",
    ],
  },
  {
    name: "app_settings",
    columns: [
      "id",
      "base_currency_id",
      "manual_gold_price_vnd_per_luong",
      "cached_gold_price_vnd_per_luong",
      "cached_gold_price_source",
      "cached_gold_price_fetched_at",
    ],
  },
];

export const BACKUP_VERSION = 1;

export async function exportData() {
  const data = {};

  for (const table of TABLES) {
    data[table.name] = await all(
      `SELECT ${table.columns.join(", ")} FROM ${table.name}`
    );
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function importData(payload) {
  const data = payload?.data;

  if (!data || typeof data !== "object") {
    throw new AppError("Backup file is missing data", 400);
  }

  return withTransaction(async () => {
    for (const table of [...TABLES].reverse()) {
      await run(`DELETE FROM ${table.name}`);
    }

    for (const table of TABLES) {
      const rows = data[table.name];

      if (rows === undefined) {
        continue;
      }

      if (!Array.isArray(rows)) {
        throw new AppError(
          `Backup table ${table.name} is not an array`,
          400
        );
      }

      for (const row of rows) {
        if (!row || typeof row !== "object") {
          throw new AppError(
            `Backup table ${table.name} has an invalid row`,
            400
          );
        }

        const columns = table.columns.filter(
          (column) => row[column] !== undefined
        );

        if (columns.length === 0) {
          continue;
        }

        const placeholders = columns.map(() => "?").join(", ");

        await run(
          `INSERT INTO ${table.name} (${columns.join(", ")}) VALUES (${placeholders})`,
          columns.map((column) => row[column])
        );
      }
    }
  });
}
