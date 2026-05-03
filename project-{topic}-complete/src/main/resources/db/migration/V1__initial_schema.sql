CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scraping_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL,
    target_url VARCHAR(2048) NOT NULL,
    description TEXT,
    selectors JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    user_id BIGINT NOT NULL,
    max_pages_to_scrape INTEGER,
    next_page_selector VARCHAR(255),
    pages_scraped_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scraping_job_status ON scraping_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scraping_job_user_id ON scraping_jobs (user_id);


CREATE TABLE IF NOT EXISTS scraped_data (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    url VARCHAR(2048) NOT NULL,
    extracted_data JSONB,
    scraped_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES scraping_jobs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scraped_data_job_id ON scraped_data (job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_data_url ON scraped_data (url);
```