# Expense Tracker

A full-stack personal expense tracking application built with **Node.js, Express, and SQLite**.

The project focuses on relational database design, transactional consistency, REST API architecture, automated testing, and integration between a backend API and a lightweight browser frontend.

## Features

- Create, view, update, and delete income and expense transactions
- Track balances across multiple accounts
- Support accounts with different currencies
- Organize transactions by category
- Transfer money between accounts
- Store exchange rates used for transfers
- Create pending transfers and complete them later
- View monthly income, expenses, and net totals
- Filter dashboard summaries by month and currency
- Start with an empty book and add accounts, categories, and currencies yourself
- Manage accounts, categories, and currencies through the app
- Click an account to see its transactions in its own currency
- Store money as integers in the smallest unit of each currency
- Archive accounts, categories, and currencies while preserving historical data
- Maintain account balances with atomic database operations
- Validate business rules at the service layer
- Protect data integrity with SQLite constraints
- Automated service and REST API tests

## Preview

The browser frontend provides a simple dashboard for viewing account balances, monthly summaries, and transactions.

![Expense Tracker Dashboard](docs/images/dashboard.png)

## Tech Stack

### Backend

- Node.js
- Express
- SQLite
- `sqlite3`

### Frontend

- HTML
- CSS
- Vanilla JavaScript
- Fetch API

### Testing

- Jest
- Supertest

## Architecture

The application uses a layered backend architecture:

```text
Browser
   ↓
REST API
   ↓
Routes
   ↓
Services
   ↓
Database Layer
   ↓
SQLite
```

Each layer has a separate responsibility:

- **Frontend** displays application data and communicates with the REST API.
- **Routes** handle HTTP requests and responses.
- **Services** contain business rules and coordinate database operations.
- **Database layer** provides Promise-based helpers for interacting with SQLite.
- **SQLite** stores application data and enforces relational constraints.

SQL is kept out of the route layer so HTTP concerns remain separate from business and persistence logic.

See [`docs/architecture.md`](docs/architecture.md) for more details.

## Database Design

The application contains six main entities:

- Currencies
- Categories
- Accounts
- Transactions
- Transfers
- Application settings

### Transactions

Transactions represent either **income** or **expenses**.

Each transaction belongs to one account and one category. Transaction amounts are always stored as positive values, while the transaction type determines how the account balance is affected.

### Transfers

Transfers are modeled separately from transactions because moving money between two accounts is neither income nor an expense.

A transfer records:

- Source account
- Destination account
- Sent amount
- Received amount
- Exchange rate
- Transfer status
- Sent date
- Received date

The exchange rate is stored with the transfer so the historical rate used for that transfer is preserved.

A transfer has one of two states:

- A **pending** transfer records the sent amount and does not change any balance.
- A **completed** transfer has moved money between the two accounts.

Completing a pending transfer debits the source account, credits the destination account, and marks the transfer completed atomically. A transfer can only be completed once.

### Multiple Currencies

Each account has one currency.

The application does not directly add values from different currencies because totals such as:

```text
100 USD + 1,000,000 VND
```

are not financially meaningful without an exchange rate.

Dashboard calculations therefore operate within a selected currency.

When a specific account is selected, the dashboard is scoped to that account too.

See [`docs/database-design.md`](docs/database-design.md) for more details.

### Money Representation

Money is stored as integers in the smallest unit of each currency.

- `currencies.decimal_places` records a currency's number of decimal places.
- `$10.50` (USD, 2 decimals) is stored as `1050` cents.
- `₫70,000` (VND, 0 decimals) is stored as `70000` dong.

JavaScript numbers are IEEE-754 doubles, so using them for money risks rounding drift, and SQLite's `NUMERIC` is only a type affinity, not an exact decimal type. Integers avoid both problems.

The API accepts and returns money only as integers. The browser converts between minor units and display format.

The exchange rate of a transfer is a ratio, not a money amount, so it is stored as an integer in micro units (`rate * 1_000_000`).

## Data Integrity

The database uses:

- Primary keys
- Foreign keys
- `NOT NULL` constraints
- `UNIQUE` constraints
- `CHECK` constraints
- Indexes

The service layer also performs business validation to provide meaningful application errors.

Database constraints remain the final integrity boundary.

## Atomic Balance Updates

Account balances are stored in the database rather than recalculated from the complete transaction history.

Because of this, operations that modify both financial records and balances must be atomic.

For example, creating an expense requires:

```text
BEGIN TRANSACTION

INSERT expense
UPDATE account balance

COMMIT
```

If either operation fails:

```text
ROLLBACK
```

The same approach is used when updating or deleting transactions and when transferring money between accounts.

This prevents situations where a transaction exists but its corresponding account balance was not updated, or vice versa.

## REST API

### Transactions

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/transactions` | List transactions |
| `GET` | `/transactions/:id` | Get one transaction |
| `POST` | `/transactions` | Create a transaction |
| `PUT` | `/transactions/:id` | Update a transaction |
| `DELETE` | `/transactions/:id` | Delete a transaction |

Transaction listing also supports filtering.

### Accounts

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/accounts` | List accounts and balances |
| `GET` | `/accounts?active=1` | List active accounts only |
| `POST` | `/accounts` | Create an account (`name`, `currencyId`, `initialBalance`) |
| `PUT` | `/accounts/:id` | Update name, currency, or active status |

The currency of an account that already owns transactions or transfers cannot be changed.

### Categories

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/categories` | List active categories |
| `GET` | `/categories?all=1` | List categories including archived |
| `POST` | `/categories` | Create a category (`name`) |
| `PUT` | `/categories/:id` | Update name or active status |

### Currencies

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/currencies` | List currencies |
| `GET` | `/currencies?active=1` | List active currencies only |
| `GET` | `/currencies?all=1` | List currencies including archived |
| `POST` | `/currencies` | Create a currency (`code`, `name`, `symbol`, `decimalPlaces`) |
| `PUT` | `/currencies/:id` | Update name, symbol, or active status |

A currency's code and `decimalPlaces` are fixed after creation because balances use them as their unit.

### Transfers

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/transfers` | List transfers |
| `GET` | `/transfers/:id` | Get one transfer |
| `POST` | `/transfers` | Create a transfer |
| `PATCH` | `/transfers/:id` | Complete a pending transfer |

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/dashboard` | Get income, expense, net, and category totals |

Example:

```text
GET /dashboard?start=2026-10-01&end=2026-11-01&currency=USD
```

`accountId` is an optional filter that scopes the totals to one account:

```text
GET /dashboard?start=2026-10-01&end=2026-11-01&currency=USD&accountId=3
```

Example response:

```json
{
  "currency": "USD",
  "decimalPlaces": 2,
  "totalIncome": 120000,
  "totalExpense": 18524,
  "net": 101476,
  "byCategory": [
    {
      "category": "Food",
      "total": 7025
    }
  ]
}
```

All amounts in the response are integers in the smallest unit of the selected currency (cents for USD).

## Frontend

The frontend is served directly by Express and communicates with the REST API using `fetch()`.

It is organized into four tabs to avoid long scrolling:

- **Tổng quan (Overview)** – monthly income, expense, and net cards with month/currency filters, clickable account cards, and the selected account's transactions
- **Giao dịch (Transactions)** – full transaction list with account and type filters
- **Chuyển khoản (Transfers)** – transfer list plus creating and completing transfers
- **Quản lý (Management)** – adding, editing, and archiving accounts, categories, and currencies

Clicking an account card selects it (highlighted), switches the summary currency to the account's currency, scopes the totals to that account, and lists its transactions below.

It supports:

- Viewing account balances
- Viewing transactions
- Viewing monthly financial summaries
- Filtering summaries by month and currency
- Adding, editing, and deleting transactions
- Viewing transfers
- Creating transfers
- Completing pending transfers
- Managing accounts, categories, and currencies

Because the API works in minor units, the frontend converts amounts to and from display format using each currency's `decimalPlaces`.

When the database is empty, the frontend shows helpful empty states and guides the user to create their first account.

After data changes, the relevant frontend data is refreshed so account balances, transaction history, transfers, and dashboard totals remain synchronized.

## Project Structure

```text
expense-tracker/
├── database/
│   ├── migrations/
│   │   └── 001_money_to_integer.sql
│   ├── schema.sql
│   ├── seed-reference.sql
│   ├── seed.sql
│   └── queries.sql
│
├── docs/
│   ├── architecture.md
│   ├── database-design.md
│   └── images/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── src/
│   ├── errors/
│   │   └── AppError.js
│   ├── routes/
│   │   ├── accounts.js
│   │   ├── categories.js
│   │   ├── currencies.js
│   │   ├── dashboard.js
│   │   ├── transactions.js
│   │   └── transfers.js
│   ├── services/
│   │   ├── accountService.js
│   │   ├── categoryService.js
│   │   ├── currencyService.js
│   │   ├── dashboardService.js
│   │   ├── transactionService.js
│   │   └── transferService.js
│   ├── app.js
│   ├── database.js
│   └── server.js
│
├── test/
│   ├── setup.js
│   ├── api.test.js
│   ├── database.test.js
│   ├── manage.test.js
│   ├── transactionService.test.js
│   └── transferService.test.js
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Getting Started

### Prerequisites

Install:

- Node.js
- npm
- SQLite

Check that they are available:

```bash
node --version
npm --version
sqlite3 --version
```

### Clone the Repository

```bash
git clone https://github.com/heoconngoc/expense-tracker.git
cd expense-tracker
```

### Install Dependencies

```bash
npm install
```

### Start the Application

```bash
npm start
```

On the first run the application creates the database automatically and seeds only reference data (USD/VND currencies and a few default categories). It does **not** seed accounts, transactions, or transfers — the book starts empty so you can add your own data.

The application runs by default at:

```text
http://localhost:3000
```

Open that address in a browser to use the frontend.

The port can also be configured through the `PORT` environment variable.

The database files themselves are ignored by Git, so each development environment can create its own local database.

### Migrate an Existing Database

If you already have a database created with an older schema, apply the migrations instead of recreating it:

```bash
sqlite3 database/expense.db < database/migrations/001_money_to_integer.sql
```

`001_money_to_integer.sql` converts money from decimal base units to integer minor units. SQLite cannot change a column type with `ALTER TABLE`, so the migration recreates the affected tables and copies the data across inside a single transaction.

### Sample Data (optional)

`database/seed.sql` contains demo accounts, transactions, and transfers. It is used by the automated tests and can be loaded manually for exploration:

```bash
sqlite3 database/dev.db < database/schema.sql
sqlite3 database/dev.db < database/seed-reference.sql
sqlite3 database/dev.db < database/seed.sql
```

## Testing

Run the automated test suite with:

```bash
npm test
```

Tests use a separate SQLite database:

```text
database/test.db
```

The test database is reset to a known schema and seed state so tests remain isolated from the development database.

The test suite covers important business behavior including:

- Creating income and expense transactions
- Account balance updates
- Transaction updates
- Transaction deletion
- Transfers
- Rollback behavior
- Invalid transaction data
- Invalid or inactive references
- REST API success and error responses

## Database Performance

Indexes are included for common transaction access patterns:

```sql
CREATE INDEX idx_transactions_account_date
ON transactions(account_id, date);

CREATE INDEX idx_transactions_date
ON transactions(date);

CREATE INDEX idx_transactions_category_id
ON transactions(category_id);
```

The composite `(account_id, date)` index supports queries that filter transactions by account and date range.

SQLite `EXPLAIN QUERY PLAN` was used to verify index usage for common query patterns.

## Error Handling

Expected application errors use a custom `AppError` containing an HTTP status code.

Examples include:

- Invalid transaction amounts
- Missing transactions
- Invalid accounts
- Inactive accounts
- Invalid categories
- Invalid transfers
- Insufficient balance
- Unknown currencies

Unexpected errors are handled by the global Express error middleware and returned as:

```json
{
  "error": "Internal server error"
}
```

Internal implementation details are not exposed to the client.

Unknown API routes return a JSON `404` response.

## Design Goals

This project was designed around several principles:

1. Keep HTTP handling separate from business logic.
2. Keep SQL out of route handlers.
3. Use relational constraints to protect database integrity.
4. Use service-layer validation for business rules.
5. Make multi-record financial operations atomic.
6. Keep transfers separate from income and expenses.
7. Avoid aggregating unrelated currencies.
8. Test important business behavior automatically.
9. Optimize common database access patterns with targeted indexes.
10. Keep the frontend lightweight and focused on consuming the REST API.

## Future Improvements

Possible future extensions include:

- User authentication
- Per-user accounts and transactions
- Automated database migration runner
- Historical exchange-rate integration
- Charts and financial visualizations
- Pagination
- More advanced transaction filtering
- Budgets and recurring transactions
- Deployment
- Logging and monitoring

These features are intentionally outside the scope of the current version.