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

CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_currency_id INTEGER NOT NULL,

  FOREIGN KEY (base_currency_id) REFERENCES currencies(id)
);