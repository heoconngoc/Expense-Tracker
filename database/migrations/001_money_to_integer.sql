-- ============================================================
-- Migration 001: store money as integers
--
-- Background
-- ----------
-- Before this migration money was stored as NUMERIC values in
-- base units (dollars, dong). JavaScript numbers are IEEE-754
-- doubles, so arithmetic on money could drift, and SQLite's
-- NUMERIC is only a type affinity, not an exact decimal type.
--
-- After this migration every monetary value is an INTEGER in
-- the smallest unit of its currency:
--   USD -> cents   (decimal_places = 2, so 10.50 becomes 1050)
--   VND -> dong    (decimal_places = 0, so 70000 stays 70000)
--
-- exchange_rate is a ratio rather than a money amount, so it is
-- stored as an INTEGER in micro units: rate * 1_000_000.
--
-- How to run (from the project root)
-- -----------------------------------
--   sqlite3 database/expense.db < database/migrations/001_money_to_integer.sql
--
-- SQLite cannot change a column's type or add a CHECK constraint
-- with ALTER TABLE, so this migration recreates the affected
-- tables and copies the data across with the values scaled.
-- Everything runs inside one transaction, so a failure rolls
-- the whole migration back.
-- ============================================================

PRAGMA foreign_keys = OFF;

BEGIN;


-- ------------------------------------------------------------
-- 1. currencies: add decimal_places
-- ------------------------------------------------------------

CREATE TABLE currencies_new (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  currency_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2 CHECK (decimal_places >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

INSERT INTO currencies_new (id, code, currency_name, symbol, decimal_places, is_active)
SELECT
  id,
  code,
  currency_name,
  symbol,
  CASE WHEN code = 'VND' THEN 0 ELSE 2 END,
  is_active
FROM currencies;


-- ------------------------------------------------------------
-- 2. accounts: scale balances to minor units
-- ------------------------------------------------------------

CREATE TABLE accounts_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  currency_id INTEGER NOT NULL,
  balance INTEGER NOT NULL CHECK (balance = CAST(balance AS INTEGER)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),

  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

INSERT INTO accounts_new (id, name, currency_id, balance, is_active)
SELECT
  a.id,
  a.name,
  a.currency_id,
  CAST(ROUND(a.balance * power(10, c.decimal_places)) AS INTEGER),
  a.is_active
FROM accounts a
JOIN currencies_new c ON c.id = a.currency_id;


-- ------------------------------------------------------------
-- 3. transactions: scale amounts to minor units
-- ------------------------------------------------------------

CREATE TABLE transactions_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date  TIMESTAMP NOT NULL,
  notes TEXT,
  category_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,

  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

INSERT INTO transactions_new
  (id, name, amount, type, date, notes, category_id, account_id)
SELECT
  t.id,
  t.name,
  CAST(ROUND(t.amount * power(10, c.decimal_places)) AS INTEGER),
  t.type,
  t.date,
  t.notes,
  t.category_id,
  t.account_id
FROM transactions t
JOIN accounts a ON a.id = t.account_id
JOIN currencies_new c ON c.id = a.currency_id;


-- ------------------------------------------------------------
-- 4. transfers: scale amounts, convert rate to micro units
-- ------------------------------------------------------------

CREATE TABLE transfers_new (
  id INTEGER PRIMARY KEY,
  source_account_id INTEGER NOT NULL,
  destination_account_id INTEGER NOT NULL,
  sent_amount INTEGER NOT NULL CHECK (sent_amount > 0),
  received_amount INTEGER CHECK (received_amount IS NULL OR received_amount > 0),
  exchange_rate INTEGER NOT NULL CHECK (exchange_rate > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  sent_date TIMESTAMP NOT NULL,
  received_date TIMESTAMP,

  FOREIGN KEY (source_account_id) REFERENCES accounts(id),
  FOREIGN KEY (destination_account_id) REFERENCES accounts(id),

  CHECK (source_account_id != destination_account_id),
  CHECK (
    status != 'completed'
    OR
    (received_amount IS NOT NULL AND received_date IS NOT NULL)
  )
);

INSERT INTO transfers_new
  (
    id,
    source_account_id,
    destination_account_id,
    sent_amount,
    received_amount,
    exchange_rate,
    status,
    sent_date,
    received_date
  )
SELECT
  tr.id,
  tr.source_account_id,
  tr.destination_account_id,
  CAST(ROUND(tr.sent_amount * power(10, sc.decimal_places)) AS INTEGER),

  CASE
    WHEN tr.received_amount IS NULL THEN NULL
    ELSE CAST(ROUND(tr.received_amount * power(10, dc.decimal_places)) AS INTEGER)
  END,

  CAST(ROUND(tr.exchange_rate * 1000000) AS INTEGER),
  tr.status,
  tr.sent_date,
  tr.received_date
FROM transfers tr
JOIN accounts sa ON sa.id = tr.source_account_id
JOIN currencies_new sc ON sc.id = sa.currency_id
JOIN accounts da ON da.id = tr.destination_account_id
JOIN currencies_new dc ON dc.id = da.currency_id;


-- ------------------------------------------------------------
-- 5. Swap the new tables in
-- ------------------------------------------------------------

DROP TABLE transfers;
DROP TABLE transactions;
DROP TABLE accounts;
DROP TABLE currencies;

ALTER TABLE currencies_new RENAME TO currencies;
ALTER TABLE accounts_new RENAME TO accounts;
ALTER TABLE transactions_new RENAME TO transactions;
ALTER TABLE transfers_new RENAME TO transfers;

COMMIT;

PRAGMA foreign_keys = ON;

-- Should return no rows. Any row means a broken reference.
PRAGMA foreign_key_check;
