# Database Design

## Entities

- Currency
- Category
- Account
- Transaction
- Transfer
- App Settings

## Relationships

Currency
  └── Account
        ├── Transaction
        └── Transfer

Category
  └── Transaction

## Money Representation

Money is stored as integers in the smallest unit of each currency.

- `currencies.decimal_places` records how many decimal places a currency uses.
- USD has `decimal_places = 2`, so `$10.50` is stored as `1050` (cents).
- VND has `decimal_places = 0`, so `₫70,000` is stored as `70000` (dong).

JavaScript numbers are IEEE-754 doubles, so storing money as a fraction
risks rounding drift. SQLite's `NUMERIC` is only a type affinity, not an
exact decimal type, so it does not solve this either. Integers do.

The exchange rate of a transfer is a ratio rather than a money amount, so
it is stored as an integer in micro units (`rate * 1_000_000`).

The API only accepts and returns integers for money. The browser converts
between minor units and display format.

## Transactions

Transactions represent income or expenses.

Each transaction belongs to:

- one account
- one category

Amounts must be positive. The transaction type determines whether the
amount increases or decreases the account balance.

## Transfers

Transfers are modeled separately from transactions because moving money
between accounts is neither income nor an expense.

A transfer contains:

- source account
- destination account
- sent amount
- received amount
- exchange rate
- status
- sent and received dates

The exchange rate is stored with the transfer so historical transfers
retain the rate used when they occurred.

A transfer is either `pending` or `completed`.

- A **pending** transfer records the sent amount and date only. It does
  not change any account balance.
- A **completed** transfer has both a received amount and a received
  date, and it has already moved money between the two accounts.

Completing a pending transfer debits the source account, credits the
destination account, and marks the transfer as completed in a single
atomic operation. A transfer can only be completed once.

## Multiple Currencies

Each account has exactly one currency.

The application does not directly aggregate values from different
currencies because doing so would produce financially meaningless
totals without historical exchange-rate information.

Dashboard calculations therefore operate within a selected currency,
and can be scoped to a single account with an optional `accountId`
filter.

## Initialization

On the first run the server creates the schema and seeds reference data
only: currencies, categories, and app settings. There are no accounts,
transactions, or transfers, so the user starts with an empty book.

`database/seed-reference.sql` holds the reference data.
`database/seed.sql` holds a full demo data set and is used by the
automated tests.

## Account Balances

Account balances are stored rather than calculated from the complete
transaction history.

Because balances are stored, transaction creation, updates, deletion,
and transfers must update balances atomically.

SQLite transactions are used to maintain this invariant.

## Archiving

Accounts, categories, and currencies can be marked inactive.

Historical records remain available, but new transactions cannot
reference inactive accounts or categories.

Archiving is used instead of deletion because an entry may still be
referenced by historical transactions and transfers. A hard delete would
either violate a foreign key or silently remove history.

## Immutable Units

Two values are fixed after creation because money already uses them as
its unit:

- A currency's `decimal_places` cannot be changed once balances exist.
- An account's currency cannot be changed once the account has
  transactions or transfers.

Changing them would reinterpret existing balances and corrupt the data.

## Integrity

Database integrity is enforced using:

- Primary keys
- Foreign keys
- UNIQUE constraints
- CHECK constraints
- NOT NULL constraints

Business validation in the service layer provides user-friendly errors,
while database constraints provide a final integrity boundary.

## Indexes

The transaction table includes indexes for common access patterns:

- `(account_id, date)`
- `date`
- `category_id`

The composite account/date index supports queries that filter by account
and date range efficiently.