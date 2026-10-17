CREATE TABLE currencies (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  currency_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2 CHECK (decimal_places >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  currency_id INTEGER NOT NULL,
  balance INTEGER NOT NULL CHECK (balance = CAST(balance AS INTEGER)),
  type TEXT NOT NULL DEFAULT 'spending'
    CHECK (type IN ('spending', 'savings', 'gold')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),

  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

CREATE TABLE transactions (
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

CREATE TABLE transfers (
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

-- Gold holdings are measured in thousandths of the chosen unit so the
-- quantity stays exact (no floating point). Example: 1.5 luong = 15000.
-- 1 luong = 10 chi. Value in VND = quantity / 1000 * price per unit.
CREATE TABLE gold_holdings (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('chi', 'luong')),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

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

-- rate_to_vnd is stored as an integer in micro units (rate * 1_000_000),
-- the same convention used by transfers.exchange_rate. VND itself is 1.
CREATE TABLE exchange_rates (
  id INTEGER PRIMARY KEY,
  currency_id INTEGER NOT NULL UNIQUE,
  rate_to_vnd INTEGER NOT NULL CHECK (rate_to_vnd > 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'api')),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (currency_id) REFERENCES currencies(id)
);

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_currency_id INTEGER NOT NULL,
  manual_gold_price_vnd_per_luong INTEGER
    CHECK (manual_gold_price_vnd_per_luong IS NULL
      OR manual_gold_price_vnd_per_luong > 0),
  cached_gold_price_vnd_per_luong INTEGER
    CHECK (cached_gold_price_vnd_per_luong IS NULL
      OR cached_gold_price_vnd_per_luong > 0),
  cached_gold_price_source TEXT,
  cached_gold_price_fetched_at TIMESTAMP,

  FOREIGN KEY (base_currency_id) REFERENCES currencies(id)
);
