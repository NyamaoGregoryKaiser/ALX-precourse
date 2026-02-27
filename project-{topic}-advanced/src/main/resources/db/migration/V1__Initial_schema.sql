```sql
-- V1__Initial_schema.sql
-- Initial schema for WebScraperX application.

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'USER', -- e.g., USER, ADMIN
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for username for faster lookups
CREATE INDEX idx_users_username ON users (username);

-- Create scraping_tasks table
CREATE TABLE scraping_tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    cron_expression VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_run_at TIMESTAMP,
    last_run_message TEXT
);

-- Index for user_id on scraping_tasks for faster lookups by user
CREATE INDEX idx_tasks_user_id ON scraping_tasks (user_id);
-- Index for status and cron_expression for scheduler
CREATE INDEX idx_tasks_status_cron ON scraping_tasks (status, cron_expression);

-- Create task_data_fields table for embeddable DataField objects
CREATE TABLE task_data_fields (
    task_id UUID NOT NULL REFERENCES scraping_tasks(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    css_selector TEXT NOT NULL,
    attribute VARCHAR(255),
    PRIMARY KEY (task_id, field_name) -- A task cannot have two fields with the same name
);

-- Create scraped_data table
CREATE TABLE scraped_data (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES scraping_tasks(id) ON DELETE CASCADE,
    scraped_at TIMESTAMP NOT NULL,
    source_url TEXT NOT NULL
);

-- Index for task_id on scraped_data for faster lookups by task
CREATE INDEX idx_scraped_data_task_id ON scraped_data (task_id);
-- Index for scraped_at for time-based queries
CREATE INDEX idx_scraped_data_scraped_at ON scraped_data (scraped_at DESC);


-- Create scraped_data_values table for the Map<String, String> data
CREATE TABLE scraped_data_values (
    scraped_data_id UUID NOT NULL REFERENCES scraped_data(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    PRIMARY KEY (scraped_data_id, field_name)
);

-- Add triggers for updated_at column to automatically update on modifications
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_scraping_tasks_updated_at
BEFORE UPDATE ON scraping_tasks
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

```