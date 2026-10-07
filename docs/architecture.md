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

The frontend supports:

- Viewing account balances
- Viewing transactions
- Viewing monthly summaries
- Filtering summaries by month and currency
- Creating transactions
- Updating transactions
- Deleting transactions

## Routes

Routes are responsible for handling HTTP requests and responses.

They validate the HTTP contract and delegate business operations to
the service layer.

Routes do not contain SQL.

## Services

The service layer contains the application's business logic.

Examples include:

- Creating transactions
- Updating account balances
- Reversing previous balance effects when transactions are updated
- Restoring balances when transactions are deleted
- Performing transfers between accounts
- Validating active accounts and categories

Operations that modify multiple pieces of related data use SQLite
transactions to maintain consistency.

## Database Layer

The database layer wraps the `sqlite3` API with Promise-based helpers:

- `run()`
- `get()`
- `all()`
- `exec()`

This allows services to interact with SQLite using async/await.

## Atomic Operations

Transaction creation, updates, deletion, and transfers may modify
multiple database records.

These operations use:

BEGIN TRANSACTION
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