# Expense Tracker Development Roadmap

This document describes the development phases of the Personal Expense Tracker project. The goal of the project is not only to build a working application, but also to practice the complete process of designing and building a database-backed application.

---

## Phase 0 — Problem Definition ✅

### Goal
Understand what the application should solve before designing the database.

### Application
The project is a single-user Personal Expense Tracker.

The application should allow the user to:

- Record income and expenses
- Organize transactions by category
- Manage multiple financial accounts
- Support accounts using different currencies
- Transfer money between accounts
- Track pending and completed transfers
- View financial summaries over different time periods
- Choose a base currency for the application

### Database Choice

SQLite was selected because the application is:

- Single-user
- Local-first
- Relatively small
- Structured and relational
- Not dependent on a separate database server

A relational database is useful because the data contains clear relationships between transactions, accounts, categories, currencies, and transfers.

---

## Phase 1 — Requirements Analysis ✅

The initial application requirements were defined before creating tables.

### Transactions

A transaction contains:

- Name
- Amount
- Type (`income` or `expense`)
- Date
- Optional notes
- Category
- Account

Every transaction belongs to exactly one category and one account.

### Categories

The application provides categories such as:

- Food
- Salary
- Transportation
- Education
- Tourism

Categories can be created and renamed.

Historical transactions should continue referencing their original category even if the category is later deactivated.

### Accounts

The user can maintain multiple accounts, for example:

- BofA Debit Card
- MB Debit Card
- USD Cash
- VND Cash

Each account uses exactly one currency.

Accounts can be deactivated when they are no longer used.

### Transfers

Transfers move money between two accounts.

A transfer contains:

- Source account
- Destination account
- Sent amount
- Received amount
- Exchange rate
- Status
- Sent date
- Received date

Transfer statuses are:

- `pending`
- `completed`

A transfer must always have a sent date.

A completed transfer must also contain a received amount and received date.

Transfers are separate from income/expense transactions because moving money between the user's own accounts should not count as income or spending.

### Base Currency

The application has one global base currency.

The base currency is stored as persistent application configuration in the database.

---

## Phase 2 — Entity Discovery ✅

The major entities were identified from the requirements.

The database contains six main tables:

1. `currencies`
2. `categories`
3. `accounts`
4. `transactions`
5. `transfers`
6. `app_settings`

Values such as transaction type and transfer status were treated as attributes rather than separate entities.

Exchange rate is stored as part of a transfer so the historical rate used for a transfer can be preserved.

---

## Phase 3 — Relationship Design ✅

The relationships between entities were identified before implementing the schema.

### Currency → Account

One currency can be used by many accounts.

```text
Currency 1 ─────── N Account
```

Implemented with:

```text
accounts.currency_id
        ↓
currencies.id
```

### Category → Transaction

One category can contain many transactions.

```text
Category 1 ─────── N Transaction
```

### Account → Transaction

One account can contain many transactions.

```text
Account 1 ─────── N Transaction
```

### Account → Transfer

A transfer has two different relationships with accounts:

```text
Account 1 ─────── N Transfer (source)

Account 1 ─────── N Transfer (destination)
```

These are represented using:

- `source_account_id`
- `destination_account_id`

### Currency → App Settings

The application's base currency references an existing currency.

```text
Currency 1 ─────── App Settings
```

---

## Phase 4 — Attribute Design ✅

Attributes were assigned to each entity.

### Currency

- id
- code
- currency name
- symbol
- active status

### Category

- id
- name
- active status

### Account

- id
- name
- currency
- balance
- active status

### Transaction

- id
- name
- amount
- type
- date
- notes
- category
- account

### Transfer

- id
- source account
- destination account
- sent amount
- received amount
- exchange rate
- status
- sent date
- received date

### App Settings

- id
- base currency

---

## Phase 5 — Constraints and Data Integrity ✅

Database constraints were designed to prevent invalid states.

Examples include:

### Primary Keys

Every table has a unique identifier.

### Foreign Keys

Foreign keys prevent references to records that do not exist.

For example:

```text
Transaction
    |
    +---- category_id → Category
    |
    +---- account_id  → Account
```

### Transaction Constraints

Transaction amounts must be positive.

Transaction type must be:

```text
income
expense
```

### Transfer Constraints

Sent amounts must be positive.

Received amounts, when present, must be positive.

Exchange rates must be positive.

The source and destination accounts cannot be the same.

Transfer status must be:

```text
pending
completed
```

If a transfer is completed, both `received_amount` and `received_date` must exist.

### Uniqueness

Examples include:

- Currency codes are unique
- Category names are unique
- Account names are unique

### App Settings

The application is single-user and should only have one settings record.

The settings table therefore restricts its ID to:

```text
id = 1
```

---

## Phase 6 — SQLite Schema Implementation ✅

The conceptual database design was translated into SQLite using `CREATE TABLE`.

The schema is stored in:

```text
database/schema.sql
```

The schema currently creates:

```text
currencies
categories
accounts
transactions
transfers
app_settings
```

Foreign-key enforcement is enabled using:

```sql
PRAGMA foreign_keys = ON;
```

The constraints were manually tested by intentionally attempting invalid inserts.

Tests included:

- Negative transaction amount
- Invalid transaction type
- Invalid category
- Invalid account
- NULL required values
- Duplicate category
- Invalid transfer status
- Same source and destination account
- Invalid transfer amounts
- Invalid exchange rate
- Completed transfer without received information

SQLite correctly rejected the invalid records.

---

## Phase 7 — Seed Data ✅

A reproducible sample dataset was created.

Seed data is stored in:

```text
database/seed.sql
```

The current seed data includes:

- USD and VND currencies
- Global USD base currency
- Five categories
- Four financial accounts
- Income and expense transactions
- Transactions across September and October 2026
- Transactions using both USD and VND accounts
- Same-currency transfers
- Cross-currency transfers
- Completed transfers
- Pending transfers

A fresh development database can be created using:

```text
schema.sql
      ↓
database structure

seed.sql
      ↓
development data
```

This gives the project a reproducible database environment.

---

# Phase 8 — SQL Querying ⬅️ NEXT

### Goal

Learn how to retrieve useful information from the relational model.

Instead of querying individual tables only, this phase will answer actual application questions.

Examples:

- What transactions happened in October?
- How much was spent in October?
- What was total income?
- What was total expense?
- Which category had the highest spending?
- What transactions belong to a particular account?
- What transfers are currently pending?
- How much was spent on Food?
- How much was spent per category?
- What currency does each transaction use?

SQL concepts practiced in this phase will include:

- `SELECT`
- `WHERE`
- `ORDER BY`
- `LIMIT`
- `JOIN`
- `GROUP BY`
- `SUM`
- `COUNT`
- `CASE`
- date filtering
- subqueries

The goal is to understand how the relational model supports real application features.

---

## Phase 9 — Database Operations and CRUD

### Goal

Move from read-only analysis to modifying application data correctly.

Operations will include:

- Create transaction
- Update transaction
- Delete or correct transaction
- Create category
- Rename category
- Archive category
- Create account
- Archive account
- Create transfer
- Complete pending transfer

Special attention will be given to maintaining account balances correctly.

---

## Phase 10 — Atomic Database Transactions

### Goal

Keep related database changes consistent.

Because account balances are stored directly, operations such as creating an expense require multiple database changes.

For example:

```text
Create $20 expense
        ↓
INSERT transaction
        +
UPDATE account balance -$20
```

These operations must either both succeed or both fail.

This phase will use:

- `BEGIN`
- `COMMIT`
- `ROLLBACK`

The goal is to understand database atomicity and consistency.

---

## Phase 11 — Node.js Integration

### Goal

Connect the application code to SQLite.

The Node.js application will:

- Open the database
- Execute SQL queries
- Insert data
- Update data
- Handle database errors
- Manage database transactions

Database access logic will begin moving out of the SQLite CLI and into application code.

---

## Phase 12 — Business Logic

### Goal

Implement application rules above the raw database layer.

Examples include:

```text
Income
→ increase account balance

Expense
→ decrease account balance

Pending transfer
→ represent money currently being transferred

Completed transfer
→ update destination account appropriately
```

This phase separates:

```text
Database constraints
        vs.
Application business logic
```

---

## Phase 13 — REST API

### Goal

Expose application functionality through HTTP endpoints.

Possible endpoints include:

```text
GET    /transactions
POST   /transactions
PATCH  /transactions/:id
DELETE /transactions/:id

GET    /accounts
POST   /accounts

GET    /categories
POST   /categories

GET    /transfers
POST   /transfers
PATCH  /transfers/:id
```

The API will connect HTTP requests to the business and database layers.

---

## Phase 14 — Automated Testing

### Goal

Replace repetitive manual database testing with automated tests.

Tests will verify:

- Database constraints
- CRUD operations
- Balance updates
- Transfer behavior
- Business rules
- API behavior

Tests should run against an isolated test database so development data is not modified.

---

## Phase 15 — Advanced SQLite and Performance

### Goal

Study how the application behaves as its data grows.

Topics may include:

- Indexes
- `EXPLAIN QUERY PLAN`
- Query optimization
- Views
- Full-text search where appropriate
- SQLite typing behavior
- Strict tables
- Backup strategy

Indexes should be introduced based on actual query patterns rather than added blindly.

---

## Phase 16 — Production and Application Polish

### Goal

Turn the learning project into a more complete application.

Possible improvements include:

- Dashboard UI
- Date-range filters
- Category reports
- Account management UI
- Currency conversion
- Historical exchange rates
- Automatic exchange-rate API integration
- Database migrations
- Backup and restore
- Error handling
- Validation
- Improved test coverage

---

# Current Status

[x] Phase 0  - Problem Definition
[x] Phase 1  - Requirements Analysis
[x] Phase 2  - Entity Discovery
[x] Phase 3  - Relationship Design
[x] Phase 4  - Attribute Design
[x] Phase 5  - Constraints and Data Integrity
[x] Phase 6  - SQLite Schema Implementation
[x] Phase 7  - Seed Data
[x] Phase 8  - SQL Querying
[x] Phase 9  - Database CRUD
[x] Phase 10 - Atomic Database Transactions
[x] Phase 11 - Node.js Integration
[x] Phase 12 - Business Logic
[x] Phase 13 - REST API

[ ] Phase 14 - Automated Testing
[ ] Phase 15 - SQLite Performance and Indexing
[ ] Phase 16 - Production Polish
