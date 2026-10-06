# Database Design

## Requirements

Personal expense tracker for a single user.

The application supports:
- income and expenses
- multiple accounts
- multiple currencies
- transfers between accounts
- categories
- financial summaries

## Entities

- Transaction
- Category
- Account
- Currency
- Transfer

## Relationships

- Category 1:N Transaction
- Account 1:N Transaction
- Currency 1:N Account
- Account 1:N Transfer as source
- Account 1:N Transfer as destination

## Design Decisions

### Transaction vs Transfer

Transactions and transfers are separate entities.

Transactions represent income and expenses.
Transfers represent movement of money between accounts.

This makes the data model clearer, although building a unified activity history may require UNION queries.

### Account Balance

Current account balance is stored instead of always calculated from the full transaction history.

Transaction and balance updates must therefore remain consistent.