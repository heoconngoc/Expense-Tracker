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

## Multiple Currencies

Each account has exactly one currency.

The application does not directly aggregate values from different
currencies because doing so would produce financially meaningless
totals without historical exchange-rate information.

Dashboard calculations therefore operate within a selected currency.

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