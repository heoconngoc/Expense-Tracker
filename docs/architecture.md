# Architecture

Expense Tracker is a full-stack application built with a layered
backend architecture.

## Application Flow

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

## Frontend

The frontend is built with HTML, CSS, and vanilla JavaScript.

It communicates with the backend through the REST API using `fetch()`.

The UI is organized into four tabs so the user does not have to scroll
through the whole application at once:

- **Overview** – summary cards (month/currency filters), clickable
  account cards, and the selected account's transactions
- **Transactions** – full list with account and type filters
- **Transfers** – list plus create/complete flows
- **Management** – manage accounts, categories, and currencies

Clicking an account card selects it, switches the summary currency to
the account's currency, scopes the dashboard totals to that account,
and shows its transactions below.

The frontend supports:

- Viewing account balances
- Viewing transactions, transfers, and monthly summaries
- Filtering summaries by month and currency
- Creating, updating, and deleting transactions
- Creating and completing transfers
- Managing accounts, categories, and currencies

Dialogs are rendered natively with `<dialog>` elements and forms are
submitted with `fetch()`.

## Startup

The server calls `initializeDatabase()` before listening. If the
`accounts` table is missing, it creates the schema and applies
`seed-reference.sql` (currencies, categories, app settings only). The
book starts empty.

## Routes

Routes are responsible for handling HTTP requests and responses.

They validate the HTTP contract and delegate business operations to
the service layer.

Routes do not contain SQL.

Account, category, and currency routes expose `GET /`, `POST /`, and
`PUT /:id` so each of these entities can be created and edited. Currencies
cannot change their code or `decimal_places` after creation, and an
account's currency cannot change once it has history.

## Services

The service layer contains the application's business logic.

Examples include:

- Creating transactions
- Updating account balances
- Reversing previous balance effects when transactions are updated
- Restoring balances when transactions are deleted
- Performing transfers between accounts
- Validating active accounts and categories
- Creating, renaming, and archiving accounts, categories, and currencies

Operations that modify multiple pieces of related data use SQLite
transactions to maintain consistency.

## Database Layer

The database layer wraps the `sqlite3` API with Promise-based helpers:

- `run()`
- `get()`
- `all()`
- `exec()`
- `withTransaction()`

This allows services to interact with SQLite using async/await.

`withTransaction(callback)` starts a transaction with `BEGIN IMMEDIATE`,
runs the callback, and `COMMIT`s. If the callback throws, the transaction
is rolled back and the original error is re-thrown. Because `BEGIN` runs
outside the try/catch, a failed `BEGIN` does not trigger a spurious
`ROLLBACK`.

The connection enables `foreign_keys`, `journal_mode = WAL`, and
`busy_timeout` once at startup. These pragmas are per-connection, so they
are configured in one place.

## Money Representation

Money is stored and transmitted as integers in the smallest unit of each
currency (see [`database-design.md`](database-design.md)). Services
validate that amounts are positive integers. The frontend performs the
conversion between minor units and display format.

## Atomic Operations

Transaction creation, updates, deletion, and transfers may modify
multiple database records.

Each operation runs inside a single `withTransaction()` call using:

BEGIN IMMEDIATE
COMMIT
ROLLBACK

This ensures that account balances and financial records cannot become
partially updated when an operation fails.

## Error Handling

Expected application errors use `AppError` with an HTTP status code.

Unexpected errors are handled by the global Express error middleware
and returned as HTTP 500 responses without exposing internal details.

## Testing

The project contains automated service and API tests using Jest and
Supertest.

Tests run against a separate SQLite test database that is reset to a
known state before tests.