```sql
-- V1__initial_schema.sql

-- Drop tables in reverse order of dependency to ensure clean recreation (for development/testing)
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;


-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for email
ALTER TABLE users ADD CONSTRAINT uk_user_email UNIQUE (email);

-- Create user_roles table for many-to-many relationship with roles (if using separate role table)
-- Or as in our case, element collection
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role) -- Composite primary key to ensure unique role per user
);

-- Create categories table
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for category name
ALTER TABLE categories ADD CONSTRAINT uk_category_name UNIQUE (name);

-- Create tasks table
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    owner_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

-- Add indexes for common foreign key lookups
CREATE INDEX idx_tasks_owner_id ON tasks (owner_id);
CREATE INDEX idx_tasks_category_id ON tasks (category_id);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

```