import { all, get, run } from "../database.js";

export async function createTransfer({
  sourceAccountId,
  destinationAccountId,
  sentAmount,
  receivedAmount,
  exchangeRate,
  sentDate,
  receivedDate,
}) {
  if (sourceAccountId === destinationAccountId) {
    throw new Error("Source and destination accounts must be different");
  }

  if (sentAmount <= 0 || receivedAmount <= 0 || exchangeRate <= 0) {
    throw new Error("Transfer amounts and exchange rate must be positive");
  }

  try {
    await run("BEGIN TRANSACTION");

    const source = await get(
      "SELECT * FROM accounts WHERE id = ?",
      [sourceAccountId]
    );

    const destination = await get(
      "SELECT * FROM accounts WHERE id = ?",
      [destinationAccountId]
    );

    if (!source || !destination) {
      throw new Error("Account not found");
    }

    await run(
      `
        UPDATE accounts
        SET balance = balance - ?
        WHERE id = ?
      `,
      [sentAmount, sourceAccountId]
    );

    await run(
      `
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
      `,
      [receivedAmount, destinationAccountId]
    );

    const result = await run(
      `
        INSERT INTO transfers (
          source_account_id,
          destination_account_id,
          sent_amount,
          received_amount,
          exchange_rate,
          status,
          sent_date,
          received_date
        )
        VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
      `,
      [
        sourceAccountId,
        destinationAccountId,
        sentAmount,
        receivedAmount,
        exchangeRate,
        sentDate,
        receivedDate,
      ]
    );

    await run("COMMIT");

    return result.lastID;
  } catch (err) {
    await run("ROLLBACK");
    throw err;
  }
}

export async function getTransfers() {
  return all(`
    SELECT
      tr.id,
      source.name AS source_account,
      destination.name AS destination_account,
      tr.sent_amount,
      tr.received_amount,
      tr.exchange_rate,
      tr.status,
      tr.sent_date,
      tr.received_date
    FROM transfers tr
    JOIN accounts source
      ON tr.source_account_id = source.id
    JOIN accounts destination
      ON tr.destination_account_id = destination.id
    ORDER BY tr.sent_date DESC, tr.id DESC
  `);
}