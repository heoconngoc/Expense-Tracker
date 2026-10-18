-- Reference data only: currencies, categories, and app settings.
-- No accounts, transactions, or transfers: the user starts with an empty
-- book and adds everything themselves.

INSERT INTO currencies
  (code, currency_name, symbol, decimal_places)
  VALUES ('USD', 'US Dollar', '$', 2);

INSERT INTO currencies
  (code, currency_name, symbol, decimal_places)
  VALUES ('VND', 'Vietnamese Dong', '₫', 0);

INSERT INTO app_settings
  (id, base_currency_id)
  VALUES (1, 1);

-- Rates used to value assets in VND. rate_to_vnd is in micro units.
-- VND is 1:1; the USD value is a sensible starting point the user can edit.
INSERT INTO exchange_rates (currency_id, rate_to_vnd, source)
  VALUES (2, 1000000, 'manual');

INSERT INTO exchange_rates (currency_id, rate_to_vnd, source)
  VALUES (1, 26000000000, 'manual');

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