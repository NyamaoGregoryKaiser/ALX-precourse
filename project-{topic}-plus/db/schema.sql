-- db/schema.sql

PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER', -- e.g., 'USER', 'ADMIN'
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- Products Table
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

-- Index for faster product name lookups
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);


-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_date TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- e.g., 'PENDING', 'COMPLETED', 'CANCELLED'
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (total_amount >= 0)
);

-- Index for faster order lookups by user
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);


-- Order_Items Table (Junction table for many-to-many relationship between Orders and Products)
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order REAL NOT NULL, -- Price of the product at the time of order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT, -- Prevent deleting product if part of an order
    UNIQUE (order_id, product_id), -- A product can only appear once in an order
    CHECK (quantity > 0),
    CHECK (price_at_order >= 0)
);

-- Index for faster order_items lookups by order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
-- Index for faster order_items lookups by product
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Trigger to update `updated_at` column for users
CREATE TRIGGER IF NOT EXISTS update_user_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;

-- Trigger to update `updated_at` column for products
CREATE TRIGGER IF NOT EXISTS update_product_updated_at
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    UPDATE products SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;

-- Trigger to update `updated_at` column for orders
CREATE TRIGGER IF NOT EXISTS update_order_updated_at
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    UPDATE orders SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;