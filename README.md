# Personal Expense Tracker

A backend application for tracking personal income, expenses, accounts, transfers, and spending summaries.

This project is being built as a hands-on exercise in relational database design, SQLite, backend architecture, and REST API development.

## Features

- Track income and expense transactions
- Organize transactions by category
- Support multiple accounts
- Support accounts with different currencies
- Transfer money between accounts
- Maintain account balances atomically
- Filter transactions by date, type, category, and account
- Generate dashboard summaries by date range and currency
- Archive categories, accounts, and currencies while preserving historical data
- REST API built with Express

## Tech Stack

- Node.js
- Express
- SQLite
- `sqlite3`
- ES Modules

## Architecture

```text
HTTP Client
    |
    v
Express Routes
    |
    v
Service Layer
    |
    v
Database Layer
    |
    v
SQLite
```

### Routes

Routes handle HTTP-specific concerns such as requests, responses, query parameters, and status codes.

### Services

Services contain application logic, validation, SQL operations, and atomic database transactions.

### Database Layer

`src/database.js` provides Promise-based wrappers around SQLite operations:

- `run()`
- `get()`
- `all()`

## Database Model

Main entities:

- Currency
- Category
- Account
- Transaction
- Transfer
- App Settings

Relationships include:

```text
Currency 1 ─── N Account
Account  1 ─── N Transaction
Category 1 ─── N Transaction

Account 1 ─── N Transfer (source)
Account 1 ─── N Transfer (destination)

Currency 1 ─── App Settings (base currency)
```

Transactions and transfers are modeled separately because transfers move money between owned accounts and should not count as income or expenses.

## Project Structure

```text
expense-tracker/
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   ├── queries.sql
│   └── expense.db
│
├── docs/
│   ├── design.md
│   ├── roadmap.md
│   └── context.md
│
├── src/
|   ├── server.js
│   ├── database.js
│   ├── errors/
│   │   └── AppError.js
│   ├── routes/
│   │   ├── accounts.js
│   │   ├── categories.js
│   │   ├── dashboard.js
│   │   ├── transactions.js
│   │   └── transfers.js
│   └── services/
│       ├── accountService.js
│       ├── categoryService.js
│       ├── dashboardService.js
│       ├── transactionService.js
│       └── transferService.js
│
├── package.json
└── README.md
```

The SQLite database file is ignored by Git. The database can be reconstructed from `schema.sql` and `seed.sql`.

## Running the Project

Install dependencies:

```bash
npm install
```

Create the database:

```bash
sqlite3 database/expense.db
```

Inside SQLite:

```sql
PRAGMA foreign_keys = ON;
.read database/schema.sql
.read database/seed.sql
```

Start the API:

```bash
npm start
```

The server runs at:

```text
http://localhost:3000
```

## API

### Transactions

```text
GET    /transactions
GET    /transactions/:id
POST   /transactions
PUT    /transactions/:id
DELETE /transactions/:id
```

Filtering is supported through query parameters such as:

```text
GET /transactions?type=expense
GET /transactions?categoryId=1
GET /transactions?start=2026-10-01&end=2026-11-01
```

### Accounts

```text
GET /accounts
```

### Categories

```text
GET /categories
```

### Transfers

```text
GET  /transfers
POST /transfers
```

### Dashboard

```text
GET /dashboard?start=2026-10-01&end=2026-11-01&currency=USD
```

The dashboard returns income, expenses, net change, and expenses grouped by category for a specific currency and date range.

## Data Integrity

Important rules are enforced through both SQLite constraints and application logic.

Examples:

- Transaction amounts must be positive.
- Transaction type must be `income` or `expense`.
- Transfer source and destination accounts must differ.
- Completed transfers require received amount and received date.
- Foreign keys preserve valid relationships.
- Account balance changes and transaction creation/update/deletion occur atomically.
- Transfers update both account balances atomically.

## Development Roadmap

Completed:

- Phase 0 — Problem Definition
- Phase 1 — Requirements Analysis
- Phase 2 — Entity Discovery
- Phase 3 — Relationship Design
- Phase 4 — Attribute Design
- Phase 5 — Constraints and Data Integrity
- Phase 6 — SQLite Schema Implementation
- Phase 7 — Seed Data
- Phase 8 — SQL Querying
- Phase 9 — Database CRUD
- Phase 10 — Atomic Database Transactions
- Phase 11 — Node.js Integration
- Phase 12 — Business Logic
- Phase 13 — REST API

Next:

- Phase 14 — Automated Testing
- Phase 15 — SQLite Performance and Indexing
- Phase 16 — Production Polish