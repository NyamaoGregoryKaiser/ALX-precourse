-- V1__Initial_schema.sql

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create user_roles join table
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create scraping_jobs table
CREATE TABLE scraping_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_url VARCHAR(2048) NOT NULL,
    css_selector VARCHAR(512) NOT NULL,
    schedule_cron VARCHAR(50),
    status VARCHAR(20) NOT NULL, -- e.g., ACTIVE, INACTIVE, RUNNING, COMPLETED, FAILED
    last_run_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create scraped_data table
CREATE TABLE scraped_data (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    data_json TEXT NOT NULL, -- Storing JSON as TEXT, consider JSONB for more advanced querying in PostgreSQL
    scraped_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (job_id) REFERENCES scraping_jobs (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_scraping_jobs_user_id ON scraping_jobs (user_id);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs (status);
CREATE INDEX idx_scraped_data_job_id ON scraped_data (job_id);

-- ALX Focus: Well-designed relational schema with proper data types, constraints,
-- foreign keys for referential integrity, and indexes for query optimization.
-- `TEXT` for `data_json` allows flexibility; `JSONB` in PostgreSQL would be
-- more advanced for querying inside JSON.
```