-- Currencies

INSERT INTO currencies
  (code, currency_name, symbol)
  VALUES ('USD', 'US Dollar', '$');

INSERT INTO currencies
  (code, currency_name, symbol)
  VALUES ('VND', 'Vietnamese Dong', '₫');

-- App Setting

INSERT INTO app_settings
  (id, base_currency_id)
  VALUES (1, 1);

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

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('BofA Debit Card', 1, 1000);

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('MB Debit Card', 2, 10000000);

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('USD cash', 1, 100);

INSERT INTO accounts
  (name, currency_id, balance)
  VALUES ('VND cash', 2, 1000000);

-- September transactions

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('September Salary', 1200, 'income', '2026-09-05', NULL, 2, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Chipotle', 14.50, 'expense', '2026-09-08', NULL, 1, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Bus Ticket', 25, 'expense', '2026-09-12', NULL, 3, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Textbook', 75, 'expense', '2026-09-20', 'Database textbook', 4, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Pho', 80000, 'expense', '2026-09-25', NULL, 1, 2);

-- October transactions

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('October Salary', 1200, 'income', '2026-10-01', NULL, 2, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Chipotle', 15.25, 'expense', '2026-10-02', NULL, 1, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Coffee', 5.50, 'expense', '2026-10-03', NULL, 1, 3);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Train Ticket', 45, 'expense', '2026-10-04', 'Weekend trip', 3, 1);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Museum Ticket', 20, 'expense', '2026-10-05', NULL, 5, 3);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Com Tam', 70000, 'expense', '2026-10-05', NULL, 1, 4);

INSERT INTO transactions
  (name, amount, type, date, notes, category_id, account_id)
  VALUES ('Online Course', 49.99, 'expense', '2026-10-06', 'SQLite course', 4, 1);

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
    100,
    100,
    1,
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
    200,
    5200000,
    26000,
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
    50,
    NULL,
    26000,
    'pending',
    '2026-10-06',
    NULL
  );