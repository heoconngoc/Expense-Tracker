-- ============================================================
-- Personal Expense Tracker
-- SQL Query and Database Operations Reference
--
-- This file contains examples developed during Phases 8–10:
--   Phase 8: Querying and aggregation
--   Phase 9: CRUD operations
--   Phase 10: Atomic database transactions
--
-- Mutation examples in Phases 9–10 are commented out so that
-- running this entire file does not modify the database.
-- ============================================================


-- ============================================================
-- PHASE 8: SQL QUERYING
-- ============================================================


-- 8.1 All transactions from October 2026, newest first.

SELECT *
FROM transactions
WHERE date >= '2026-10-01'
  AND date < '2026-11-01'
ORDER BY date DESC;


-- 8.2 All expense transactions from October 2026.

SELECT *
FROM transactions
WHERE date >= '2026-10-01'
  AND date < '2026-11-01'
  AND type = 'expense'
ORDER BY date DESC;


-- 8.3 October expenses with category and account names.

SELECT
  t.name AS transaction_name,
  t.amount,
  t.date,
  c.name AS category,
  a.name AS account
FROM transactions t
JOIN categories c
  ON t.category_id = c.id
JOIN accounts a
  ON t.account_id = a.id
WHERE t.date >= '2026-10-01'
  AND t.date < '2026-11-01'
  AND t.type = 'expense'
ORDER BY t.date DESC;


-- 8.4 October expenses with category, account, and currency.

SELECT
  t.name AS transaction_name,
  t.amount,
  t.date,
  c.name AS category,
  a.name AS account,
  cur.code AS currency_code
FROM transactions t
JOIN categories c
  ON t.category_id = c.id
JOIN accounts a
  ON t.account_id = a.id
JOIN currencies cur
  ON a.currency_id = cur.id
WHERE t.date >= '2026-10-01'
  AND t.date < '2026-11-01'
  AND t.type = 'expense'
ORDER BY t.date DESC;


-- 8.5 Number of expense transactions in October 2026.

SELECT COUNT(*) AS expense_count
FROM transactions
WHERE date >= '2026-10-01'
  AND date < '2026-11-01'
  AND type = 'expense';


-- 8.6 Total USD expenses in October 2026.
--
-- Currency must be checked through:
-- transaction -> account -> currency.
-- We must not sum USD and VND amounts together.

SELECT SUM(t.amount) AS total_usd_expense
FROM transactions t
JOIN accounts a
  ON t.account_id = a.id
JOIN currencies cur
  ON a.currency_id = cur.id
WHERE t.date >= '2026-10-01'
  AND t.date < '2026-11-01'
  AND t.type = 'expense'
  AND cur.code = 'USD';


-- 8.7 Total October USD spending grouped by category.

SELECT
  c.name AS category,
  SUM(t.amount) AS total_spent,
  cur.code AS currency
FROM transactions t
JOIN categories c
  ON t.category_id = c.id
JOIN accounts a
  ON t.account_id = a.id
JOIN currencies cur
  ON a.currency_id = cur.id
WHERE t.date >= '2026-10-01'
  AND t.date < '2026-11-01'
  AND t.type = 'expense'
  AND cur.code = 'USD'
GROUP BY c.id, c.name, cur.code
ORDER BY total_spent DESC;


-- 8.8 Highest-spending category for USD expenses in October 2026.

SELECT
  c.name AS category,
  SUM(t.amount) AS total_spent,
  cur.code AS currency
FROM transactions t
JOIN categories c
  ON t.category_id = c.id
JOIN accounts a
  ON t.account_id = a.id
JOIN currencies cur
  ON a.currency_id = cur.id
WHERE t.date >= '2026-10-01'
  AND t.date < '2026-11-01'
  AND t.type = 'expense'
  AND cur.code = 'USD'
GROUP BY c.id, c.name, cur.code
ORDER BY total_spent DESC
LIMIT 1;


-- 8.9 Total USD income and expenses in October 2026.
--
-- This demonstrates conditional aggregation with CASE.

SELECT
  SUM(
    CASE
      WHEN t.type = 'income' THEN t.amount
      ELSE 0
    END
  ) AS total_income,
  SUM(
    CASE
      WHEN t.type = 'expense' THEN t.amount
      ELSE 0
    END
  ) AS total_expense,
  cur.code AS currency
FROM transactions t
JOIN accounts a
  ON t.account_id = a.id
JOIN currencies cur
  ON a.currency_id = cur.id
WHERE t.date >= '2026-10-01'
  AND t.date < '2026-11-01'
  AND cur.code = 'USD'
GROUP BY cur.code;


-- 8.10 Pending transfers.
--
-- The accounts table is joined twice because a transfer has
-- both a source account and a destination account.

SELECT
  tr.id,
  source.name AS source_account,
  destination.name AS destination_account,
  tr.sent_amount,
  tr.exchange_rate,
  tr.sent_date
FROM transfers tr
JOIN accounts source
  ON tr.source_account_id = source.id
JOIN accounts destination
  ON tr.destination_account_id = destination.id
WHERE tr.status = 'pending'
ORDER BY tr.sent_date DESC;


-- 8.11 All transactions for the BofA Debit Card.

SELECT
  t.name,
  t.amount,
  t.type,
  t.date,
  c.name AS category
FROM transactions t
JOIN categories c
  ON t.category_id = c.id
JOIN accounts a
  ON t.account_id = a.id
WHERE a.name = 'BofA Debit Card'
ORDER BY t.date DESC;


-- 8.12 Net change from all USD income and expense transactions.
--
-- Income contributes positively.
-- Expenses contribute negatively.
--
-- Note: This is a derived transaction net change. The application
-- currently stores account balances directly, so this query is not
-- used as the authoritative account balance.

SELECT
  SUM(
    CASE
      WHEN t.type = 'income' THEN t.amount
      ELSE -t.amount
    END
  ) AS net_change
FROM transactions t
JOIN accounts a
  ON t.account_id = a.id
JOIN currencies cur
  ON a.currency_id = cur.id
WHERE cur.code = 'USD';


-- ============================================================
-- PHASE 9: CRUD OPERATIONS
-- ============================================================
--
-- These examples modify data, so they are commented out.
-- Run them individually when practicing CRUD operations.


-- 9.1 CREATE
-- Create an expense using subqueries to look up foreign keys.

/*
INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
VALUES (
  'Starbucks',
  6.75,
  'expense',
  '2026-10-07',
  'Coffee with friend',
  (SELECT id FROM categories WHERE name = 'Food'),
  (SELECT id FROM accounts WHERE name = 'BofA Debit Card')
);
*/


-- 9.2 UPDATE
-- Correct the amount of transaction 13.

/*
UPDATE transactions
SET amount = 8.25
WHERE id = 13;
*/


-- 9.3 UPDATE multiple fields.

/*
UPDATE transactions
SET
  name = 'Blue Wall',
  amount = 9.50,
  notes = 'Lunch'
WHERE id = 13;
*/


-- 9.4 Update the account balance after creating an expense.
--
-- The account and amount are obtained from the transaction rather
-- than hard-coded.

/*
UPDATE accounts
SET balance = balance - (
  SELECT amount
  FROM transactions
  WHERE id = 13
)
WHERE id = (
  SELECT account_id
  FROM transactions
  WHERE id = 13
);
*/


-- 9.5 Reverse the balance change before deleting an expense.
--
-- Important: These are still two independent SQL statements.
-- If one succeeds and the other fails, the database could become
-- inconsistent. Phase 10 solves this with a database transaction.

/*
UPDATE accounts
SET balance = balance + (
  SELECT amount
  FROM transactions
  WHERE id = 13
)
WHERE id = (
  SELECT account_id
  FROM transactions
  WHERE id = 13
);

DELETE FROM transactions
WHERE id = 13;
*/


-- 9.6 Archive a category instead of deleting historical data.

/*
UPDATE categories
SET is_active = 0
WHERE name = 'Tourism';
*/


-- Show only categories available for new transactions.

SELECT id, name
FROM categories
WHERE is_active = 1
ORDER BY name;


-- 9.7 Foreign-key protection.
--
-- This DELETE should fail if Food is referenced by existing
-- transactions and PRAGMA foreign_keys = ON.

/*
DELETE FROM categories
WHERE name = 'Food';
*/


-- ============================================================
-- PHASE 10: ATOMIC DATABASE TRANSACTIONS
-- ============================================================
--
-- A database transaction allows several related operations to
-- succeed or fail as one unit.


-- 10.1 ROLLBACK example.
--
-- Both the new transaction and balance update are visible inside
-- this database transaction, but ROLLBACK cancels both changes.

/*
BEGIN TRANSACTION;

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
VALUES
  ('Rollback Test Expense', 100, 'expense', '2026-10-07', NULL, 1, 1);

UPDATE accounts
SET balance = balance - 100
WHERE id = 1;

ROLLBACK;
*/


-- 10.2 COMMIT example.
--
-- COMMIT makes both changes permanent.

/*
BEGIN TRANSACTION;

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
VALUES
  ('Commit Test Expense', 10, 'expense', '2026-10-07', NULL, 1, 1);

UPDATE accounts
SET balance = balance - 10
WHERE id = 1;

COMMIT;
*/


-- ============================================================
-- Key lessons
-- ============================================================
--
-- SELECT / WHERE / ORDER BY
--   Read and filter rows.
--
-- JOIN
--   Follow relationships between tables.
--
-- COUNT / SUM / GROUP BY / CASE
--   Aggregate data for reports and dashboards.
--
-- INSERT / UPDATE / DELETE
--   Modify persistent data.
--
-- Foreign keys
--   Protect relationships between tables.
--
-- is_active
--   Allows historical configuration data to be archived instead
--   of deleted.
--
-- BEGIN / COMMIT / ROLLBACK
--   Group related writes into one atomic database transaction.
--
-- Expense Tracker invariant:
--
--   transaction change + account balance change
--
-- must eventually be performed atomically so that the database
-- cannot be left in a partially updated state.