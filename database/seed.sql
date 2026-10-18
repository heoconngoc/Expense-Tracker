-- Currencies
-- Money is stored as integers in the smallest unit of each currency:
--   USD -> cents (decimal_places = 2)
--   VND -> dong  (decimal_places = 0)

INSERT INTO currencies
  (code, currency_name, symbol, decimal_places)
  VALUES ('USD', 'US Dollar', '$', 2);

INSERT INTO currencies
  (code, currency_name, symbol, decimal_places)
  VALUES ('VND', 'Vietnamese Dong', '₫', 0);

-- App Setting

INSERT INTO app_settings
  (id, base_currency_id)
  VALUES (1, 1);

-- Rates used to value assets in VND. rate_to_vnd is in micro units.
-- VND is 1:1; the USD value is a sensible starting point the user can edit.
INSERT INTO exchange_rates (currency_id, rate_to_vnd, source)
  VALUES (2, 1000000, 'manual');

INSERT INTO exchange_rates (currency_id, rate_to_vnd, source)
  VALUES (1, 26000000000, 'manual');

-- Categories

INSERT INTO categories
  (name)
  VALUES ('Food');

INSERT INTO categories
  (name)
  VALUES ('Salary');

INSERT INTO categories
  (name)
  VALUES ('Transportation');

INSERT INTO categories
  (name)
  VALUES ('Education');

INSERT INTO categories
  (name)
  VALUES ('Tourism');
  
-- Accounts
-- Balances are integers in minor units (USD cents / VND dong).

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('BofA Debit Card', 1, 100000);

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('MB Debit Card', 2, 10000000);

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('USD cash', 1, 10000);

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('VND cash', 2, 1000000);

-- September transactions
-- Amounts are integers in minor units of the account's currency.

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('September Salary', 120000, 'income', '2026-09-05', NULL, 2, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Chipotle', 1450, 'expense', '2026-09-08', NULL, 1, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Bus Ticket', 2500, 'expense', '2026-09-12', NULL, 3, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Textbook', 7500, 'expense', '2026-09-20', 'Database textbook', 4, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Pho', 80000, 'expense', '2026-09-25', NULL, 1, 2);

-- October transactions

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('October Salary', 120000, 'income', '2026-10-01', NULL, 2, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Chipotle', 1525, 'expense', '2026-10-02', NULL, 1, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Coffee', 550, 'expense', '2026-10-03', NULL, 1, 3);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Train Ticket', 4500, 'expense', '2026-10-04', 'Weekend trip', 3, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Museum Ticket', 2000, 'expense', '2026-10-05', NULL, 5, 3);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Com Tam', 70000, 'expense', '2026-10-05', NULL, 1, 4);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Online Course', 4999, 'expense', '2026-10-06', 'SQLite course', 4, 1);

-- Transfers
-- sent_amount / received_amount are minor units.
-- exchange_rate is stored as an integer in micro units (rate * 1_000_000).

INSERT INTO transfers
  (
    source_account_id,
    destination_account_id,
    sent_amount,
    received_amount,
    exchange_rate,
    status,
    sent_date,
    received_date
  )
  VALUES
  (
    1,
    3,
    10000,
    10000,
    1000000,
    'completed',
    '2026-09-10',
    '2026-09-10'
  );

INSERT INTO transfers
  (
    source_account_id,
    destination_account_id,
    sent_amount,
    received_amount,
    exchange_rate,
    status,
    sent_date,
    received_date
  )
  VALUES
  (
    1,
    2,
    20000,
    5200000,
    26000000000,
    'completed',
    '2026-09-15',
    '2026-09-16'
  );

INSERT INTO transfers
  (
    source_account_id,
    destination_account_id,
    sent_amount,
    received_amount,
    exchange_rate,
    status,
    sent_date,
    received_date
  )
  VALUES
  (
    1,
    2,
    5000,
    NULL,
    26000000000,
    'pending',
    '2026-10-06',
    NULL
  );