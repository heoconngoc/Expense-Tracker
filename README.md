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
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── database/
│   ├── migrations/
│   │   ├── 001_money_to_integer.sql
│   │   └── 002_asset_features.sql
│   ├── schema.sql
│   ├── seed-reference.sql
│   ├── seed.sql
│   └── queries.sql
│
├── deploy/
│   ├── backup-db.sh
│   └── nginx.conf
│
├── docs/
│   ├── PLAN.md
│   ├── LESSONS.md
│   ├── QA-CHECKLIST.md
│   └── images/
│
├── public/
│   ├── js/
│   │   └── charts.js
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── src/
│   ├── errors/
│   │   └── AppError.js
│   ├── routes/
│   │   ├── accounts.js
│   │   ├── assets.js
│   │   ├── backup.js
│   │   ├── categories.js
│   │   ├── currencies.js
│   │   ├── dashboard.js
│   │   ├── exchangeRates.js
│   │   ├── goldHoldings.js
│   │   ├── goldPrices.js
│   │   ├── savingsGoals.js
│   │   ├── settings.js
│   │   ├── transactions.js
│   │   └── transfers.js
│   ├── services/
│   │   ├── accountService.js
│   │   ├── assetService.js
│   │   ├── backupService.js
│   │   ├── categoryService.js
│   │   ├── currencyService.js
│   │   ├── dashboardService.js
│   │   ├── exchangeRateService.js
│   │   ├── goldHoldingService.js
│   │   ├── goldPriceService.js
│   │   ├── savingsGoalService.js
│   │   ├── settingsService.js
│   │   ├── transactionService.js
│   │   └── transferService.js
│   ├── app.js
│   ├── database.js
│   └── server.js
│
├── test/
│   ├── setup.js
│   └── *.test.js
│
├── ecosystem.config.cjs
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

## Deployment (Azure VM + continuous deployment)

The app runs on a small Ubuntu VM with this layout:

```text
Browser
  │  HTTP(S) + basic auth
  ▼
nginx (reverse proxy, port 80/443)
  ▼
pm2 ──► node src/server.js (port 3000)
  ▼
/var/lib/expense-tracker/expense.db   (data, outside the deploy folder)
/var/lib/expense-tracker/backups/     (nightly .db.gz, kept 7 days)
```

Code lives in `/var/www/expense-tracker` and is **wiped on every deploy**, so the
database and backups are kept in `/var/lib` and are never touched by a redeploy.

Files that support this:

- `ecosystem.config.cjs` — pm2 process definition + production env
- `deploy/backup-db.sh` — nightly SQLite `.backup` + gzip + 7-day retention
- `deploy/nginx.conf` — reverse proxy + basic auth
- `.github/workflows/deploy.yml` — on green CI on `main`: rsync, `npm ci`, pm2 reload

### Part 1 — Create the VM (Azure portal)

1. Sign in to <https://portal.azure.com>. If you are a student, first activate
   **Azure for Students** at <https://azure.microsoft.com/free/students>
   (verify with your school email — no credit card required).
2. In the portal search bar type **Virtual machines** → **Create** →
   **Azure virtual machine**.
3. Fill in the **Basics** tab:
   - **Subscription**: Azure for Students (or your subscription).
   - **Resource group**: create new, e.g. `expense-tracker-rg`.
   - **Virtual machine name**: `expense-tracker-vm`.
   - **Region**: **Southeast Asia** (closest to Vietnam).
   - **Availability options**: No infrastructure redundancy required.
   - **Security type**: Standard.
   - **Image**: **Ubuntu Server 24.04 LTS - x64 Gen2**.
   - **Size**: click **See all sizes**, search `B1s` (1 vCPU, 1 GiB). Under
     Azure for Students it is free for 750 hours/month. If `B1s` is unavailable
     in the region, pick `B1ls`/`B2ats_v2` but check the free-tier note.
   - **Authentication type**: **SSH public key**.
   - **Username**: e.g. `azureuser`.
   - **SSH public key source**: **Generate new key pair**; **Key pair name**:
     `expense-tracker-key`.
   - **Public inbound ports**: **Allow selected ports** → check **SSH (22)** and
     **HTTP (80)**. Add **HTTPS (443)** too if you plan to use a domain.
4. **Disks** tab: leave defaults (Standard SSD is fine).
5. **Networking** tab: keep the defaults (it creates a public IP + NSG). Make
   sure inbound 22, 80 (and 443) are allowed.
6. **Review + create** → **Create**. When prompted, **Download private key and
   create resource**. You get `expense-tracker-key.pem` — keep it safe, this is
   the only copy.
7. After deployment, open the VM and copy the **Public IP address** (Overview
   page). You need it for SSH and GitHub secrets.

Move the key to a safe place and lock it down (on your Mac):

```bash
mv ~/Downloads/expense-tracker-key.pem ~/.ssh/expense-tracker-key.pem
chmod 400 ~/.ssh/expense-tracker-key.pem
```

Connect for the first time (replace the IP):

```bash
ssh -i ~/.ssh/expense-tracker-key.pem azureuser@<PUBLIC_IP>
```

### Part 2 — Prepare the VM

Run these on the VM (after `ssh`):

```bash
# 1. System packages
sudo apt update
sudo apt install -y nginx sqlite3 rsync build-essential python3 apache2-utils

# 2. Node.js 24 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 3. pm2 (process manager) + run it on boot
sudo npm install -g pm2
pm2 startup systemd -u "$USER" --hp "$HOME"   # run the printed sudo command

# 4. Data + deploy folders
sudo mkdir -p /var/lib/expense-tracker/backups
sudo chown -R "$USER":"$USER" /var/lib/expense-tracker
sudo mkdir -p /var/www/expense-tracker
sudo chown -R "$USER":"$USER" /var/www/expense-tracker
```

Verify: `node -v` (v24.x) and `pm2 -v`.

### Part 3 — GitHub repository secrets

On GitHub open your repo → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**. Add:

| Secret | Value |
|---|---|
| `AZURE_SSH_HOST` | the VM public IP (e.g. `20.1.2.3`) |
| `AZURE_SSH_USER` | `azureuser` |
| `AZURE_SSH_KEY` | the **entire contents** of `expense-tracker-key.pem`, including the `-----BEGIN/END-----` lines |

To print the key for copying:

```bash
cat ~/.ssh/expense-tracker-key.pem
```

### Part 4 — First deploy

The deploy pipeline runs automatically when CI passes on `main`. To bring the
app up for the first time, merge/push `develop` into `main` (or push any commit
to `main`). The **Deploy** workflow will rsync the code, run `npm ci --omit=dev`
and start pm2.

If you prefer to do the first deploy by hand (optional sanity check):

```bash
# on your Mac
rsync -avz --delete --exclude node_modules --exclude .git \
  --exclude '.env' --exclude 'database/*.db*' --exclude 'database/backups' \
  -e "ssh -i ~/.ssh/expense-tracker-key.pem" \
  ./ azureuser@<PUBLIC_IP>:/var/www/expense-tracker/

# on the VM
cd /var/www/expense-tracker
npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
pm2 logs expense-tracker --lines 30
```

The app now listens on `http://127.0.0.1:3000`. You can check directly with
`curl http://127.0.0.1:3000/dashboard?...` before exposing it via nginx.

### Part 5 — nginx reverse proxy + basic auth

```bash
# 1. Expose the site config
sudo cp /var/www/expense-tracker/deploy/nginx.conf /etc/nginx/sites-available/expense-tracker
sudo ln -sf /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/expense-tracker
sudo rm -f /etc/nginx/sites-enabled/default

# 2. Basic auth (choose a username, set a password when prompted)
sudo htpasswd -c /etc/nginx/.htpasswd yourname

# 3. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

Open `http://<PUBLIC_IP>` in a browser — the browser should ask for the
username/password, then show the app.

HTTPS (optional — needs a domain whose A record points at the VM's public IP):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Part 6 — Nightly database backup

```bash
# create the cron job (runs every day at 03:00 as the current user)
( crontab -l 2>/dev/null; \
  echo '0 3 * * * DB_PATH=/var/lib/expense-tracker/expense.db BACKUP_DIR=/var/lib/expense-tracker/backups /var/www/expense-tracker/deploy/backup-db.sh >> /var/log/expense-backup.log 2>&1' \
) | crontab -
```

Run it once to confirm it works:

```bash
DB_PATH=/var/lib/expense-tracker/expense.db \
BACKUP_DIR=/var/lib/expense-tracker/backups \
/var/www/expense-tracker/deploy/backup-db.sh
ls -lh /var/lib/expense-tracker/backups
```

### Part 7 — Restore a backup

```bash
cd /var/lib/expense-tracker/backups
gunzip -k expense-YYYY-MM-DD-HHMMSS.db.gz          # keep the .gz too
pm2 stop expense-tracker
cp expense-YYYY-MM-DD-HHMMSS.db /var/lib/expense-tracker/expense.db
rm -f /var/lib/expense-tracker/expense.db-wal /var/lib/expense-tracker/expense.db-shm
pm2 start expense-tracker
```

Alternatively, use the in-app **Xuất/Nhập JSON** feature in the Quản lý tab to
export from anywhere and import back.

### Ongoing deploys

1. Push to `develop`, open a PR, merge into `main`.
2. CI runs on `main`; when green, the **Deploy** workflow syncs the VM and runs
   `pm2 startOrReload`.
3. Reload the browser. The database is untouched (it lives in `/var/lib`).

### Troubleshooting

```bash
pm2 status                          # is the process online?
pm2 logs expense-tracker            # app logs
sudo tail -f /var/log/nginx/error.log
sudo systemctl status nginx
curl -I http://127.0.0.1:3000       # bypass nginx
```

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
- Historical exchange-rate integration
- Pagination
- More advanced transaction filtering
- Budgets and recurring transactions
- Logging and monitoring

These features are intentionally outside the scope of the current version.