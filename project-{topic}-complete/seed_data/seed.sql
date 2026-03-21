```sql
-- seed_data/seed.sql

-- Example timestamp function for SQLite (not native)
-- In a real application, timestamps would be handled by the application or a more robust DB.
-- For now, using current_timestamp for SQLite, assuming application sets it.

-- Seed an Admin User
INSERT INTO users (username, password_hash, email, role, created_at, updated_at) VALUES
('admin_user', 'hashed_admin_password_123', 'admin@example.com', 'ADMIN', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'));

-- Seed a Merchant User
INSERT INTO users (username, password_hash, email, role, created_at, updated_at) VALUES
('merchant_user', 'hashed_merchant_password_123', 'merchant@example.com', 'MERCHANT', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'));

-- Seed accounts for the Merchant User (assuming merchant_user has ID=2 if autoincrement starts from 1)
-- You would typically get the actual user_id after insertion.
INSERT INTO accounts (user_id, name, currency, balance, status, created_at, updated_at) VALUES
((SELECT id FROM users WHERE username = 'merchant_user'), 'Main Merchant Account', 'USD', 10000.00, 'ACTIVE', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
((SELECT id FROM users WHERE username = 'merchant_user'), 'Euro Merchant Account', 'EUR', 5000.00, 'ACTIVE', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'));

-- Seed some transactions for the first merchant account (assuming Main Merchant Account has ID=1 if autoincrement starts from 1)
-- Again, typically you'd use dynamic IDs.
INSERT INTO transactions (account_id, external_id, type, amount, currency, status, description, created_at, updated_at) VALUES
((SELECT id FROM accounts WHERE name = 'Main Merchant Account' AND user_id = (SELECT id FROM users WHERE username = 'merchant_user')), 'ext_tx_12345', 'PAYMENT', 150.75, 'USD', 'COMPLETED', 'Online Sale #A1', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
((SELECT id FROM accounts WHERE name = 'Main Merchant Account' AND user_id = (SELECT id FROM users WHERE username = 'merchant_user')), 'ext_tx_12346', 'PAYMENT', 200.00, 'USD', 'PENDING', 'Subscription Payment', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW')),
((SELECT id FROM accounts WHERE name = 'Euro Merchant Account' AND user_id = (SELECT id FROM users WHERE username = 'merchant_user')), 'ext_tx_EU789', 'PAYMENT', 80.50, 'EUR', 'COMPLETED', 'European Sale #B2', STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'), STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'NOW'));
```