# Development Context

## Current Status

Phases 0–13 are complete.

The next task is:

**Phase 14 — Automated Testing**

Do not redesign the database or restart earlier phases unless a test reveals an actual problem.

## Learning Goal

This project is being built primarily to learn the complete database/backend development process:

```text
Idea
→ Requirements
→ Entities
→ Relationships
→ Schema
→ Constraints
→ SQL
→ CRUD
→ Transactions
→ Node integration
→ Business logic
→ REST API
→ Automated testing
→ Performance
→ Production polish
```

The learner already understands JavaScript Promises, async/await, ES modules, and basic Express concepts. Do not spend significant time reteaching those.

Prefer one meaningful exercise for each new concept rather than repetitive exercises. Boilerplate can be provided directly.

## Architecture

Current architecture:

```text
HTTP Client
    ↓
Express Route
    ↓
Service
    ↓
database.js
    ↓
SQLite
```

Routes should not contain SQL.

Services contain SQL, validation, and business logic.

`database.js` exposes Promise-based:

```text
run()
get()
all()
```

## Database

Tables:

```text
currencies
categories
accounts
transactions
transfers
app_settings
```

Important relationships:

```text
Currency 1:N Account

Category 1:N Transaction
Account 1:N Transaction

Account 1:N Transfer as source
Account 1:N Transfer as destination

Currency → App Settings base currency
```

Transaction and Transfer intentionally remain separate entities.

## Important Business Rules

Transaction:

```text
amount > 0
type = income | expense
exactly one category
exactly one account
```

Balance effect:

```text
income  → +amount
expense → -amount
```

Account balance is stored rather than derived.

Therefore transaction creation, modification, and deletion must update the account balance atomically.

### Create Transaction

```text
BEGIN
INSERT transaction
apply balance effect
COMMIT
```

### Update Transaction

```text
BEGIN
read old transaction
undo old balance effect
update transaction
apply new balance effect
COMMIT
```

### Delete Transaction

```text
BEGIN
read transaction
undo balance effect
delete transaction
COMMIT
```

All failures must ROLLBACK.

## Transfers

Transfers do not count as income or expenses.

Completed transfer:

```text
BEGIN
debit source account by sent_amount
credit destination account by received_amount
insert transfer
COMMIT
```

Source and destination must differ.

Transfer statuses:

```text
pending
completed
```

The current implementation primarily focuses on completed transfers.

Historical exchange rate is stored on each transfer.

## Multi-Currency Rule

Never directly aggregate transactions belonging to different currencies.

Dashboard queries must filter by currency.

Example:

```text
GET /dashboard
  ?start=2026-10-01
  &end=2026-11-01
  &currency=USD
```

## API

Implemented API:

```text
GET    /transactions
GET    /transactions/:id
POST   /transactions
PUT    /transactions/:id
DELETE /transactions/:id

GET    /accounts
GET    /categories

GET    /transfers
POST   /transfers

GET    /dashboard
```

Transaction list supports filters including:

```text
type
categoryId
accountId
start
end
```

## Error Handling

Custom error:

```text
src/errors/AppError.js
```

Expected application errors use:

```js
throw new AppError(message, statusCode);
```

Examples:

```text
invalid client input → 400
resource not found   → 404
```

Unexpected SQLite/server errors remain ordinary errors and become HTTP 500 responses.

The Express error middleware is registered last in `server.js`.

## SQLite Integrity

Important constraints include:

- Foreign keys enabled
- Unique currency code
- Unique category name
- Unique account name
- Positive transaction amounts
- Transaction type check
- Positive transfer amounts/rates
- Different transfer source/destination
- Completed transfers require received amount/date
- Singleton app settings row (`id = 1`)

Used categories/accounts/currencies should generally be archived using `is_active = 0` instead of deleted.

Unused configuration rows may be deleted.

## Development Database Warning

`database/expense.db` has been modified manually throughout development and contains experimental records.

Examples have included:

```text
Blue Wall
Test Expense
Dinner
Coffee API Test
Health category
```

Do NOT rely on the current development database for deterministic automated tests.

`schema.sql` and `seed.sql` are the reproducible source of database structure/data.

Phase 14 should introduce an isolated test database.

## Phase 14 Goal

Build automated tests that can run with:

```bash
npm test
```

Testing should use a separate database rather than `database/expense.db`.

Important behaviors to test:

```text
create expense → balance decreases
create income → balance increases
invalid transaction → rejected
update → old balance effect undone, new effect applied
delete → balance restored
completed transfer → source decreases and destination increases
failure → transaction rolls back
HTTP validation → appropriate status code
not found → 404
```

Avoid spending time testing trivial getters exhaustively.

## Remaining Roadmap

### Phase 14 — Automated Testing

Focus on test isolation, deterministic database state, service/business-rule tests, and a small number of API tests.

### Phase 15 — SQLite Performance

Study:

```text
indexes
EXPLAIN QUERY PLAN
query optimization
```

Use actual application queries to decide what should be indexed.

### Phase 16 — Production Polish

Final cleanup:

```text
error handling
validation
scripts
project structure
README
API documentation
final architecture review
```

Optional future Phase 17 could add a frontend, but frontend development is outside the current core roadmap.

## Working Style

After each completed phase, make a Git commit.

Continue from Phase 14 rather than repeating earlier material.