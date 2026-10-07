import { createTransaction } from "./services/transactionService.js";
import { get } from "./database.js";

try {
  const id = await createTransaction({
    name: "Should Rollback",
    amount: 50,
    type: "expense",
    date: "2026-10-08",
    categoryId: 1,
    accountId: 1
  });

  console.log("Created transaction:", id);

  const transaction = await get(
    "SELECT * FROM transactions WHERE id = ?",
    [id]
  );

  const account = await get(
    "SELECT * FROM accounts WHERE id = ?",
    [1]
  );

  console.log(transaction);
  console.log("New balance:", account.balance);
} catch (err) {
  console.error(err);
}