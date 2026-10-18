-- ============================================================
-- Migration 002: asset, gold, savings, and exchange-rate features
--
-- Background
-- ----------
-- The app grew from a simple expense tracker into a personal
-- finance book. This migration adds the data the new screens need:
--
--   * accounts.type        spending | savings | gold
--   * gold_holdings        how much SJC gold the user owns
--   * savings_goals        savings targets
--   * savings_contributions  money put toward a goal
--   * exchange_rates       rates used to value assets in VND
--   * app_settings columns for a manual gold price fallback and
--     the last successfully fetched gold price (so a network
--     failure never leaves the user without a value)
--
-- Conventions
-- -----------
-- Gold quantity is stored as an integer in thousandths of the
-- chosen unit (1 luong = 10 chi, so 1.5 luong = 15000).
-- Rates are stored as integers in micro units (rate * 1_000_000),
-- the same convention as transfers.exchange_rate.
--
-- How to run (from the project root)
-- -----------------------------------
--   node -e "import('./src/database.js').then(m => m.runMigrations())"
-- or just start the server; migrations run automatically.
--
-- The runner copies database/expense.db to database/backups/ first.
-- ============================================================

PRAGMA foreign_keys = OFF;

BEGIN;

-- ------------------------------------------------------------
-- 1. accounts: add a type so assets can be grouped
-- ------------------------------------------------------------

ALTER TABLE accounts
  ADD COLUMN type TEXT NOT NULL DEFAULT 'spending'
  CHECK (type IN ('spending', 'savings', 'gold'));


-- ------------------------------------------------------------
-- 2. gold_holdings
-- ------------------------------------------------------------

CREATE TABLE gold_holdings (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('chi', 'luong')),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id)
);


-- ------------------------------------------------------------
-- 3. savings goals and contributions
-- ------------------------------------------------------------

CREATE TABLE savings_goals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  currency_id INTEGER NOT NULL,
  deadline TIMESTAMP,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

CREATE TABLE savings_contributions (
  id INTEGER PRIMARY KEY,
  goal_id INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  contributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (goal_id) REFERENCES savings_goals(id)
);


-- ------------------------------------------------------------
-- 4. exchange_rates
-- ------------------------------------------------------------

CREATE TABLE exchange_rates (
  id INTEGER PRIMARY KEY,
  currency_id INTEGER NOT NULL UNIQUE,
  rate_to_vnd INTEGER NOT NULL CHECK (rate_to_vnd > 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'api')),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

-- Seed one rate per currency. VND is 1:1. The USD value is a
-- starting point the user can update from the UI.
INSERT INTO exchange_rates (currency_id, rate_to_vnd, source)
SELECT id, CASE WHEN code = 'VND' THEN 1000000 ELSE 26000000000 END, 'manual'
FROM currencies;


-- ------------------------------------------------------------
-- 5. app_settings: gold price fallback + cache
-- ------------------------------------------------------------

ALTER TABLE app_settings
  ADD COLUMN manual_gold_price_vnd_per_luong INTEGER
  CHECK (manual_gold_price_vnd_per_luong IS NULL
    OR manual_gold_price_vnd_per_luong > 0);

ALTER TABLE app_settings
  ADD COLUMN cached_gold_price_vnd_per_luong INTEGER
  CHECK (cached_gold_price_vnd_per_luong IS NULL
    OR cached_gold_price_vnd_per_luong > 0);

ALTER TABLE app_settings
  ADD COLUMN cached_gold_price_source TEXT;

ALTER TABLE app_settings
  ADD COLUMN cached_gold_price_fetched_at TIMESTAMP;

COMMIT;

PRAGMA foreign_keys = ON;

-- Should return no rows. Any row means a broken reference.
PRAGMA foreign_key_check;
