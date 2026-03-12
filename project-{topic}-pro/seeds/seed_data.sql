```sql
-- Seed data for development environment

-- Insert sample users
INSERT INTO users (username, email, hashed_password, role) VALUES
('admin_user', 'admin@example.com', 'hashed_admin_password', 'admin'),
('merchant_user', 'merchant@example.com', 'hashed_merchant_password', 'merchant'),
('customer_one', 'customer1@example.com', 'hashed_customer1_password', 'customer'),
('customer_two', 'customer2@example.com', 'hashed_customer2_password', 'customer')
ON CONFLICT (username) DO NOTHING; -- Avoid duplicate inserts on re-seed

-- Note: hashed passwords here are placeholders. In a real scenario, use `hashed_<password>`.
-- For example, 'hashed_admin_password' should actually be the bcrypt/argon2 hash of 'admin_password'.

-- Insert sample accounts for users
INSERT INTO accounts (owner_user_id, account_number, account_name, balance, currency, status) VALUES
((SELECT id FROM users WHERE username = 'admin_user'), 'ACC-ADMIN-001', 'Admin Wallet', 10000.00, 'USD', 'active'),
((SELECT id FROM users WHERE username = 'merchant_user'), 'ACC-MERCH-001', 'Merchant Payout', 5000.00, 'USD', 'active'),
((SELECT id FROM users WHERE username = 'customer_one'), 'ACC-CUST1-001', 'Primary Account', 1500.50, 'USD', 'active'),
((SELECT id FROM users WHERE username = 'customer_one'), 'ACC-CUST1-002', 'Savings Account', 200.00, 'EUR', 'active'),
((SELECT id FROM users WHERE username = 'customer_two'), 'ACC-CUST2-001', 'Main Account', 800.75, 'USD', 'active')
ON CONFLICT (account_number) DO NOTHING;

-- Insert sample transactions (for illustration - usually created dynamically)
INSERT INTO transactions (transaction_uuid, source_account_id, destination_account_id, amount, currency, transaction_type, status, description) VALUES
('txn-deposit-001', NULL, (SELECT id FROM accounts WHERE account_number = 'ACC-CUST1-001'), 200.00, 'USD', 'deposit', 'processed', 'Initial deposit'),
('txn-payment-001', (SELECT id FROM accounts WHERE account_number = 'ACC-CUST1-001'), (SELECT id FROM accounts WHERE account_number = 'ACC-MERCH-001'), 50.00, 'USD', 'payment', 'processed', 'Payment for goods'),
('txn-withdrawal-001', (SELECT id FROM accounts WHERE account_number = 'ACC-CUST2-001'), NULL, 100.00, 'USD', 'withdrawal', 'pending', 'ATM withdrawal request')
ON CONFLICT (transaction_uuid) DO NOTHING;
```