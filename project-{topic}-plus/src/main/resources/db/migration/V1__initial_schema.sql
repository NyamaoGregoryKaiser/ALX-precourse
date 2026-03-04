-- V1__initial_schema.sql

-- Disable check constraints temporarily if needed for initial data load or complex migrations
-- SET session_replication_role = 'replica';

-- Create the roles table
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    account_non_expired BOOLEAN NOT NULL DEFAULT TRUE,
    account_non_locked BOOLEAN NOT NULL DEFAULT TRUE,
    credentials_non_expired BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create the join table for many-to-many relationship between users and roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

-- Create indexes for frequently queried columns to improve performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);

-- Re-enable check constraints if they were disabled
-- SET session_replication_role = 'origin';

-- Add comments for better database documentation
COMMENT ON TABLE roles IS 'Stores user roles for authorization.';
COMMENT ON COLUMN roles.id IS 'Unique identifier for the role.';
COMMENT ON COLUMN roles.name IS 'Name of the role (e.g., ROLE_USER, ROLE_ADMIN). Must be unique.';
COMMENT ON COLUMN roles.created_at IS 'Timestamp when the role was created.';
COMMENT ON COLUMN roles.updated_at IS 'Timestamp when the role was last updated.';

COMMENT ON TABLE users IS 'Stores user authentication and profile information.';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user.';
COMMENT ON COLUMN users.username IS 'Unique username for authentication.';
COMMENT ON COLUMN users.email IS 'Unique email address for the user.';
COMMENT ON COLUMN users.password IS 'Hashed password of the user.';
COMMENT ON COLUMN users.enabled IS 'Indicates if the user account is enabled (true) or disabled (false).';
COMMENT ON COLUMN users.account_non_expired IS 'Indicates if the user account has not expired (true) or has expired (false).';
COMMENT ON COLUMN users.account_non_locked IS 'Indicates if the user account is not locked (true) or is locked (false).';
COMMENT ON COLUMN users.credentials_non_expired IS 'Indicates if the user credentials (password) has not expired (true) or has expired (false).';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user account was created.';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the user account was last updated.';

COMMENT ON TABLE user_roles IS 'Junction table for many-to-many relationship between users and roles.';
COMMENT ON COLUMN user_roles.user_id IS 'Foreign key to the users table.';
COMMENT ON COLUMN user_roles.role_id IS 'Foreign key to the roles table.';
```

#### `src/main/resources/db/migration/V2__seed_data.sql`

```sql