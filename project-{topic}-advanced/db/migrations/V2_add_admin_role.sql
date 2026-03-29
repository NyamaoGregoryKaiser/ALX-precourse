```sql
-- V2_add_admin_role.sql

-- Add a default role to existing users if the column was added in a previous version
-- and wasn't specified with a default. This is more defensive.
-- The V1 script already includes `role TEXT NOT NULL DEFAULT 'USER'` so this particular migration
-- might be redundant if V1 is always run from scratch, but useful if V1 existed without role.

-- In a real migration system, you'd check if the column exists first, e.g.:
-- PRAGMA table_info(users); and then conditionally ALTER TABLE
-- For SQLite, this is harder, usually means dropping and recreating or using a temp table.
-- Given V1 now includes role, this script primarily ensures any 'old' users get a role.

-- Update all existing users to 'USER' role if they don't have one (if the column wasn't NOT NULL DEFAULT)
-- If the column was created with NOT NULL DEFAULT, this statement would effectively do nothing on existing data.
UPDATE users SET role = 'USER' WHERE role IS NULL OR role = '';

-- Note: The V1 script already sets a default role 'USER'.
-- This V2 migration would be more impactful if `role` was added as a nullable column first,
-- and then later made non-nullable with a default.
-- It serves as a placeholder for demonstrating a second migration.
```