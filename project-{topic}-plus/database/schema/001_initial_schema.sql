```sql
-- Disable foreign key checks temporarily if needed, though not strictly required for schema creation.
-- SET CONSTRAINTS ALL DEFERRED;

-- -----------------------------------------------------
-- Schema task_manager_db
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- e.g., 'user', 'admin'
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by username and email
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

-- -----------------------------------------------------
-- Table `projects`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_owner
        FOREIGN KEY (owner_id)
        REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- Index for faster lookups by owner and name
CREATE INDEX idx_projects_owner_id ON projects (owner_id);
CREATE INDEX idx_projects_name ON projects (name);

-- -----------------------------------------------------
-- Table `tasks`
-- -----------------------------------------------------
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
CREATE TYPE task_status AS ENUM ('Open', 'InProgress', 'Blocked', 'Review', 'Done', 'Archived');

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'Open',
    priority task_priority DEFAULT 'Medium',
    due_date TIMESTAMP WITHOUT TIME ZONE,
    assigned_to INT, -- Can be NULL if not assigned
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_project
        FOREIGN KEY (project_id)
        REFERENCES projects (id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    CONSTRAINT fk_tasks_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users (id)
        ON DELETE SET NULL -- If user is deleted, assignment becomes NULL
        ON UPDATE NO ACTION
);

-- Indexes for tasks
CREATE INDEX idx_tasks_project_id ON tasks (project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_priority ON tasks (priority);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

-- -----------------------------------------------------
-- Table `tags`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by tag name
CREATE INDEX idx_tags_name ON tags (name);

-- -----------------------------------------------------
-- Junction Table `task_tags` (Many-to-Many relationship between tasks and tags)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS task_tags (
    task_id INT NOT NOT NULL,
    tag_id INT NOT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_task_tags_task
        FOREIGN KEY (task_id)
        REFERENCES tasks (id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    CONSTRAINT fk_task_tags_tag
        FOREIGN KEY (tag_id)
        REFERENCES tags (id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Function to update `updated_at` column automatically
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables that have an `updated_at` column
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public')
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_timestamp()', t_name, t_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- Initial Seed Data (Optional, can be in seed/seed_data.sql)
-- -----------------------------------------------------
-- This would typically be in a separate seed_data.sql file.
-- Example of creating an admin user if not already present.
-- INSERT INTO users (username, email, password_hash, role) VALUES
-- ('admin', 'admin@example.com', 'hashed_admin_password', 'admin')
-- ON CONFLICT (username) DO NOTHING;
```