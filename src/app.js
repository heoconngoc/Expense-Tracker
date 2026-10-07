import express from "express";

import transactionRoutes from "./routes/transactions.js";
import transferRoutes from "./routes/transfers.js";
import accountRoutes from "./routes/accounts.js";
import categoryRoutes from "./routes/categories.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();

app.use(express.json());

app.use("/transactions", transactionRoutes);
app.use("/transfers", transferRoutes);
app.use("/accounts", accountRoutes);
app.use("/categories", categoryRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  });
});

export default app;