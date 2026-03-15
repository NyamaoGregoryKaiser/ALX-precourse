-- db/migrations/001_create_tables.sql

-- This file is an example of a migration script.
-- In a real production system, a dedicated migration tool (like Flyway, Alembic, or custom scripts)
-- would manage the application of these scripts in a controlled manner.

-- For SQLite, you can manually run this script or integrate it into your Docker entrypoint.

PRAGMA foreign_keys = ON;

-- Create Users Table if it does not exist
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Create Products Table if it does not exist
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price REAL NOT NULL,
    stock_quantity INTEGER NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (price >= 0),
    CHECK (stock_quantity >= 0)
);

-- Create Orders Table if it does not exist
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_date TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (total_amount >= 0)
);

-- Create Order_Items Table if it does not exist
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    UNIQUE (order_id, product_id),
    CHECK (quantity > 0),
    CHECK (price_at_order >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Add triggers for updated_at column
CREATE TRIGGER IF NOT EXISTS update_user_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_product_updated_at
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    UPDATE products SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_order_updated_at
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    UPDATE orders SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;

-- This migration script ensures all necessary tables and related objects are present.
-- Subsequent migrations would be named 002_add_new_column.sql, 003_refactor_table.sql etc.