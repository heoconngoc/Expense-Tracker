import app from "./app.js";
import { initializeDatabase } from "./database.js";

const PORT = process.env.PORT || 3000;

async function start() {
  const initialized = await initializeDatabase();

  if (initialized) {
    console.log(
      "Database initialized with reference data only (currencies and categories)."
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();