SELECT * FROM transactions 
  WHERE date >= '2026-10-01' AND date < '2026-11-01'
  ORDER BY date ASC;

SELECT * FROM transactions 
  WHERE 
    date >= '2026-10-01' AND date < '2026-11-01' 
    AND type = 'expense'
  ORDER BY date DESC;

SELECT t.name AS transaction_name, t.amount, c.name AS category, a.name AS account
  FROM transactions t 
  JOIN 
    categories c ON
      t.category_id = c.id 
  JOIN 
    accounts a ON
      t.account_id = a.id 
  WHERE 
    date >= '2026-10-01' AND date < '2026-11-01' 
    AND type = 'expense'
  ORDER BY date DESC;

SELECT 
    t.name AS transaction_name, 
    t.amount, 
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
  WHERE 
    t.date >= '2026-10-01'
    AND t.date < '2026-11-01' 
    AND t.type = 'expense'
  ORDER BY t.date DESC;

SELECT COUNT(*) AS expense_count FROM transactions
  WHERE date >= '2026-10-01' AND date < '2026-11-01'
  AND type = 'expense';

SELECT SUM(t.amount) AS expense_sum FROM transactions t
  JOIN accounts a
    ON t.account_id = a.id 
  JOIN currencies cur
    ON a.currency_id = cur.id
  WHERE t.date >= '2026-10-01' AND t.date < '2026-11-01'
  AND t.type = 'expense'
  AND cur.code = 'USD';

SELECT c.name, SUM(t.amount) AS total, cur.code AS Currency 
  FROM transactions t
  JOIN categories c 
    ON t.category_id = c.id
  JOIN accounts a
    ON t.account_id = a.id 
  JOIN currencies cur
    ON a.currency_id = cur.id
  WHERE t.date >= '2026-10-01' AND t.date < '2026-11-01'
  AND t.type = 'expense'
  AND cur.code = 'USD'
  GROUP BY c.id, c.name, cur.code;

SELECT c.name, SUM(t.amount) AS total, cur.code AS Currency 
  FROM transactions t
  JOIN categories c 
    ON t.category_id = c.id
  JOIN accounts a
    ON t.account_id = a.id 
  JOIN currencies cur
    ON a.currency_id = cur.id
  WHERE t.date >= '2026-10-01' AND t.date < '2026-11-01'
  AND t.type = 'expense'
  AND cur.code = 'USD'
  GROUP BY c.id, c.name, cur.code
  ORDER BY SUM(t.amount) DESC LIMIT 1;

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
  cur.code as Currency
  FROM transactions t
  JOIN accounts a
    ON t.account_id = a.id 
  JOIN currencies cur
    ON a.currency_id = cur.id
  WHERE t.date >= '2026-10-01' AND t.date < '2026-11-01'
  AND cur.code = 'USD'
  GROUP BY cur.code;

SELECT
    t.id,
    source.name AS source_account,
    destination.name AS destination_account,
    t.sent_amount,
    t.exchange_rate,
    t.sent_date
  FROM transfers t
  JOIN accounts source
    ON t.source_account_id = source.id
  JOIN accounts destination
    ON t.destination_account_id = destination.id
  WHERE t.status = 'pending'
  ORDER BY t.sent_date DESC;

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

SELECT
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
      AS net_change
  FROM transactions t
  JOIN accounts a
    ON t.account_id = a.id
  JOIN currencies cur
    ON a.currency_id = cur.id
  WHERE cur.code = 'USD';

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

UPDATE transactions SET amount=8.25 WHERE id=13;
UPDATE transactions SET (name, amount, notes)=('Blue Wall', 9.50, 'Lunch') WHERE id=13;
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
DELETE FROM transactions WHERE id = 13;

UPDATE categories
  SET is_active=0
  WHERE name='Tourism';