```sql
-- V1__initial_schema.sql

-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_roles table for many-to-many relationship with roles (enum)
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    roles VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, roles),
    CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create scraping_targets table
CREATE TABLE scraping_targets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_target_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_target_name_per_user UNIQUE (user_id, name)
);

-- Create css_selectors table
CREATE TABLE css_selectors (
    id BIGSERIAL PRIMARY KEY,
    target_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    selector_value TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., TEXT, ATTRIBUTE, HTML
    attribute_name VARCHAR(255), -- Used if type is ATTRIBUTE
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_selector_target FOREIGN KEY (target_id) REFERENCES scraping_targets(id) ON DELETE CASCADE,
    CONSTRAINT unique_selector_name_per_target UNIQUE (target_id, name)
);

-- Create scraping_jobs table
CREATE TABLE scraping_jobs (
    id BIGSERIAL PRIMARY KEY,
    target_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL, -- e.g., CREATED, SCHEDULED, RUNNING, COMPLETED, FAILED, STOPPED, PAUSED
    schedule_cron VARCHAR(255), -- CRON expression, nullable for manual jobs
    last_run_at TIMESTAMP WITHOUT TIME ZONE,
    next_run_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_target FOREIGN KEY (target_id) REFERENCES scraping_targets(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create scraping_results table
CREATE TABLE scraping_results (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    target_id BIGINT NOT NULL,
    extracted_data JSONB NOT NULL, -- Store extracted data as JSON B
    successful BOOLEAN NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_result_job FOREIGN KEY (job_id) REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_result_target FOREIGN KEY (target_id) REFERENCES scraping_targets(id) ON DELETE CASCADE
);

-- Add indexes for query optimization
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_targets_user_id ON scraping_targets (user_id);
CREATE INDEX idx_jobs_target_id ON scraping_jobs (target_id);
CREATE INDEX idx_jobs_user_id ON scraping_jobs (user_id);
CREATE INDEX idx_jobs_status_next_run ON scraping_jobs (status, next_run_at);
CREATE INDEX idx_results_job_id ON scraping_results (job_id);
CREATE INDEX idx_results_target_id ON scraping_results (target_id);
CREATE INDEX idx_results_timestamp ON scraping_results (timestamp DESC);

-- Update trigger functions for `updated_at` (if not handled by Hibernate directly)
-- For PostgreSQL, usually this is handled by Hibernate's @UpdateTimestamp.
-- If not, a trigger function would look like this:
/*
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_targets_updated_at
BEFORE UPDATE ON scraping_targets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_selectors_updated_at
BEFORE UPDATE ON css_selectors
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON scraping_jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
*/
```