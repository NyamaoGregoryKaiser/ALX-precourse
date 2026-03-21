```sql
-- V2__add_index_to_transactions.sql
-- Example of a subsequent migration: add an index if not already added in V1, or a new column.

-- Add an index on transaction type for common filtering scenarios
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

-- Example: Add a new column to accounts table
-- ALTER TABLE accounts ADD COLUMN api_key TEXT;
```