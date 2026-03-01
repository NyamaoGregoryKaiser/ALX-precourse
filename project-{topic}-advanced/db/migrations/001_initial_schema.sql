-- Create the 'users' table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enabled BOOLEAN DEFAULT TRUE
);

-- Add index on email for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Create the 'roles' table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Create the 'user_roles' junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create the 'sessions' table for JWT invalidation/blacklist
-- This table stores active JWT tokens that have been issued and are not yet explicitly logged out/blacklisted.
-- When a user logs out, their token is removed from this table.
-- When a token is verified, we check if it exists in this table AND is not expired.
CREATE TABLE IF NOT EXISTS sessions (
    jwt_token VARCHAR(512) PRIMARY KEY, -- JWTs can be long, so VARCHAR(512) or TEXT
    user_id BIGINT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add index on expires_at for efficient cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
-- Add index on user_id for quick lookup of user's active sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
```