import app from "./app.js";
import {
  initializeDatabase,
  runMigrations,
} from "./database.js";

const PORT = process.env.PORT || 3000;

async function start() {
  const initialized = await initializeDatabase();

  if (initialized) {
    console.log(
      process.env.SEED_SAMPLE
        ? "Database initialized with sample data (demo mode)."
        : "Database initialized with reference data only (currencies and categories)."
    );
  }

  const applied = await runMigrations({
    freshInstall: initialized,
  });

  if (applied.length > 0) {
    console.log(
      `Applied migrations: ${applied.join(", ")}`
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();