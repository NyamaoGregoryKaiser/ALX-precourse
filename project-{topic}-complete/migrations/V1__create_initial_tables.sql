```sql
-- V1__create_initial_tables.sql

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL, -- e.g., 'ADMIN', 'MERCHANT', 'VIEWER'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL, -- e.g., 'ACTIVE', 'INACTIVE', 'SUSPENDED'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    external_id TEXT UNIQUE, -- Transaction ID from external gateway, can be NULL
    type TEXT NOT NULL,       -- e.g., 'PAYMENT', 'REFUND', 'WITHDRAWAL', 'DEPOSIT'
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,     -- e.g., 'PENDING', 'COMPLETED', 'FAILED'
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions (external_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
```