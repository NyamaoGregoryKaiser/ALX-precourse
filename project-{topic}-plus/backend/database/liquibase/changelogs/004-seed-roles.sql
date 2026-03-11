--liquibase formatted sql

-- changeset alx:4
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_MODERATOR') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;
-- rollback DELETE FROM roles WHERE name IN ('ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ADMIN');
```

#### `backend/database/liquibase/changelogs/005-seed-admin-user.sql`
```sql