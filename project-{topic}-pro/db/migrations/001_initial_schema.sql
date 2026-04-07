```sql
-- Use UUIDs for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster user lookups
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

-- Scraping Jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'running', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01 00:00:00 UTC', -- Epoch time initially
    run_interval_seconds INTEGER NOT NULL DEFAULT 0, -- 0 for one-time job, >0 for scheduled
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster job lookups by user and status
CREATE INDEX idx_jobs_user_id ON scraping_jobs (user_id);
CREATE INDEX idx_jobs_status ON scraping_jobs (status);
CREATE INDEX idx_jobs_active_interval ON scraping_jobs (is_active, last_run_at, run_interval_seconds);


-- Scraping Targets table (URLs and rules for a job)
CREATE TABLE IF NOT EXISTS scraping_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET', -- e.g., GET, POST
    payload TEXT, -- JSON string for POST data
    headers JSONB DEFAULT '{}', -- JSONB for HTTP headers
    selectors JSONB NOT NULL, -- JSONB for CSS selectors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE
);

-- Index for faster target lookups by job
CREATE INDEX idx_targets_job_id ON scraping_targets (job_id);


-- Scraped Results table (stores extracted data)
CREATE TABLE IF NOT EXISTS scraped_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    target_id UUID NOT NULL,
    data JSONB NOT NULL, -- The actual scraped data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES scraping_targets(id) ON DELETE CASCADE
);

-- Indexes for faster result lookups
CREATE INDEX idx_results_job_id ON scraped_results (job_id);
CREATE INDEX idx_results_target_id ON scraped_results (target_id);
CREATE INDEX idx_results_created_at ON scraped_results (created_at DESC);

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for 'updated_at'
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_scraping_jobs_timestamp
BEFORE UPDATE ON scraping_jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_scraping_targets_timestamp
BEFORE UPDATE ON scraping_targets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```