-- This is the first migration, it should contain the same content as init.sql
-- In a real project, subsequent migrations would be for schema changes.

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'USER' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create SCRAPE_JOB_STATUS ENUM type
DO $$ BEGIN
    CREATE TYPE SCRAPE_JOB_STATUS AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    selectors JSONB DEFAULT '[]'::jsonb NOT NULL, -- Array of {key: "...", selector: "..."}
    cron_schedule VARCHAR(255) DEFAULT 'manual' NOT NULL,
    status SCRAPE_JOB_STATUS DEFAULT 'PENDING' NOT NULL,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE
);

-- Create scraped_items table
CREATE TABLE IF NOT EXISTS scraped_items (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL, -- The specific URL from which this item was scraped
    data JSONB DEFAULT '{}'::jsonb NOT NULL, -- Extracted key-value pairs
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_html_fragment TEXT -- Optional: for debugging or advanced re-parsing
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_id ON scrape_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraped_items_job_id ON scraped_items(job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_items_scraped_at ON scraped_items(scraped_at);

-- Trigger to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_scrape_jobs_updated_at ON scrape_jobs;
CREATE TRIGGER trg_scrape_jobs_updated_at
BEFORE UPDATE ON scrape_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();