import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import transactionRoutes from "./routes/transactions.js";
import transferRoutes from "./routes/transfers.js";
import accountRoutes from "./routes/accounts.js";
import assetRoutes from "./routes/assets.js";
import categoryRoutes from "./routes/categories.js";
import currencyRoutes from "./routes/currencies.js";
import dashboardRoutes from "./routes/dashboard.js";
import exchangeRateRoutes from "./routes/exchangeRates.js";
import goldHoldingRoutes from "./routes/goldHoldings.js";
import goldPriceRoutes from "./routes/goldPrices.js";
import settingsRoutes from "./routes/settings.js";
import savingsGoalRoutes from "./routes/savingsGoals.js";
import backupRoutes from "./routes/backup.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const chartJsFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "node_modules",
  "chart.js",
  "dist",
  "chart.umd.js"
);

app.get("/vendor/chart.js", (req, res) => {
  res.sendFile(chartJsFile);
});

app.use("/transactions", transactionRoutes);
app.use("/transfers", transferRoutes);
app.use("/accounts", accountRoutes);
app.use("/assets", assetRoutes);
app.use("/categories", categoryRoutes);
app.use("/currencies", currencyRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/exchange-rates", exchangeRateRoutes);
app.use("/gold-holdings", goldHoldingRoutes);
app.use("/gold-prices", goldPriceRoutes);
app.use("/settings", settingsRoutes);
app.use("/savings-goals", savingsGoalRoutes);
app.use("/backup", backupRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  });
});

export default app;