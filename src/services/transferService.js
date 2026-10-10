import { all, get, run, withTransaction } from "../database.js";
import AppError from "../errors/AppError.js";

const RATE_SCALE = 1_000_000;

function assertPositiveInteger(value, message) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(message, 400);
  }
}

function assertActiveAccounts(source, destination) {
  if (!source || source.is_active !== 1) {
    throw new AppError("Source account not found or inactive", 400);
  }

  if (!destination || destination.is_active !== 1) {
    throw new AppError(
      "Destination account not found or inactive",
      400
    );
  }
}

async function findAccounts(sourceAccountId, destinationAccountId) {
  const source = await get(
    "SELECT * FROM accounts WHERE id = ?",
    [sourceAccountId]
  );

  const destination = await get(
    "SELECT * FROM accounts WHERE id = ?",
    [destinationAccountId]
  );

  assertActiveAccounts(source, destination);

  return { source, destination };
}

function validateTransfer({
  sourceAccountId,
  destinationAccountId,
  sentAmount,
  receivedAmount,
  exchangeRate,
  status,
  sentDate,
  receivedDate,
}) {
  if (sourceAccountId === destinationAccountId) {
    throw new AppError(
      "Source and destination accounts must be different",
      400
    );
  }

  assertPositiveInteger(
    sentAmount,
    "sentAmount must be a positive integer in the smallest unit"
  );

  if (
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0
  ) {
    throw new AppError(
      "exchangeRate must be a positive number",
      400
    );
  }

  if (!["pending", "completed"].includes(status)) {
    throw new AppError(
      "Status must be pending or completed",
      400
    );
  }

  if (status === "completed") {
    assertPositiveInteger(
      receivedAmount,
      "receivedAmount must be a positive integer in the smallest unit"
    );

    if (!receivedDate) {
      throw new AppError(
        "receivedDate is required for a completed transfer",
        400
      );
    }
  }

  if (!sentDate) {
    throw new AppError("sentDate is required", 400);
  }
}

export async function createTransfer({
  sourceAccountId,
  destinationAccountId,
  sentAmount,
  receivedAmount = null,
  exchangeRate,
  status = "completed",
  sentDate,
  receivedDate = null,
}) {
  validateTransfer({
    sourceAccountId,
    destinationAccountId,
    sentAmount,
    receivedAmount,
    exchangeRate,
    status,
    sentDate,
    receivedDate,
  });

  return withTransaction(async () => {
    const { source } = await findAccounts(
      sourceAccountId,
      destinationAccountId
    );

    if (status === "completed" && source.balance < sentAmount) {
      throw new AppError("Insufficient balance", 400);
    }

    if (status === "completed") {
      await run(
        `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
        [sentAmount, sourceAccountId]
      );

      await run(
        `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
        [receivedAmount, destinationAccountId]
      );
    }

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sourceAccountId,
        destinationAccountId,
        sentAmount,
        receivedAmount,
        Math.round(exchangeRate * RATE_SCALE),
        status,
        sentDate,
        receivedDate,
      ]
    );

    return getTransferById(result.lastID);
  });
}

export async function completeTransfer(
  id,
  { receivedAmount, receivedDate }
) {
  assertPositiveInteger(
    receivedAmount,
    "receivedAmount must be a positive integer in the smallest unit"
  );

  if (!receivedDate) {
    throw new AppError("receivedDate is required", 400);
  }

  return withTransaction(async () => {
    const transfer = await get(
      "SELECT * FROM transfers WHERE id = ?",
      [id]
    );

    if (!transfer) {
      throw new AppError("Transfer not found", 404);
    }

    if (transfer.status === "completed") {
      throw new AppError(
        "Transfer has already been completed",
        400
      );
    }

    const { source, destination } = await findAccounts(
      transfer.source_account_id,
      transfer.destination_account_id
    );

    if (source.balance < transfer.sent_amount) {
      throw new AppError("Insufficient balance", 400);
    }

    await run(
      `UPDATE accounts SET balance = balance - ? WHERE id = ?`,
      [transfer.sent_amount, transfer.source_account_id]
    );

    await run(
      `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
      [receivedAmount, transfer.destination_account_id]
    );

    await run(
      `
        UPDATE transfers
        SET
          received_amount = ?,
          received_date = ?,
          status = 'completed'
        WHERE id = ?
      `,
      [receivedAmount, receivedDate, id]
    );

    return getTransferById(id);
  });
}

const TRANSFER_COLUMNS = `
  tr.id,
  tr.source_account_id AS sourceAccountId,
  source.name AS sourceAccount,
  source_cur.code AS sourceCurrency,
  source_cur.decimal_places AS sourceDecimalPlaces,
  tr.destination_account_id AS destinationAccountId,
  destination.name AS destinationAccount,
  destination_cur.code AS destinationCurrency,
  destination_cur.decimal_places AS destinationDecimalPlaces,
  tr.sent_amount AS sentAmount,
  tr.received_amount AS receivedAmount,
  tr.exchange_rate / 1000000.0 AS exchangeRate,
  tr.status,
  tr.sent_date AS sentDate,
  tr.received_date AS receivedDate
`;

const TRANSFER_JOINS = `
  FROM transfers tr
  JOIN accounts source
    ON tr.source_account_id = source.id
  JOIN currencies source_cur
    ON source.currency_id = source_cur.id
  JOIN accounts destination
    ON tr.destination_account_id = destination.id
  JOIN currencies destination_cur
    ON destination.currency_id = destination_cur.id
`;

export async function getTransferById(id) {
  const transfer = await get(
    `
      SELECT ${TRANSFER_COLUMNS}
      ${TRANSFER_JOINS}
      WHERE tr.id = ?
    `,
    [id]
  );

  if (transfer) {
    transfer.exchangeRate = Math.round(
      transfer.exchangeRate * RATE_SCALE
    ) / RATE_SCALE;
  }

  return transfer;
}

export async function getTransfers({ status } = {}) {
  let sql = `
    SELECT ${TRANSFER_COLUMNS}
    ${TRANSFER_JOINS}
  `;

  const params = [];

  if (status) {
    sql += " WHERE tr.status = ?";
    params.push(status);
  }

  sql += " ORDER BY tr.sent_date DESC, tr.id DESC";

  const transfers = await all(sql, params);

  return transfers.map((transfer) => ({
    ...transfer,
    exchangeRate: Math.round(
      transfer.exchangeRate * RATE_SCALE
    ) / RATE_SCALE,
  }));
}
