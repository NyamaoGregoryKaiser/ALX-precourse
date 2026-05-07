-- V1__initial_schema.sql

-- Table for Monitored Applications
CREATE TABLE monitored_applications (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

-- Table for Metrics associated with applications
CREATE TABLE metrics (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- e.g., GAUGE, COUNTER, HISTOGRAM
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_application
        FOREIGN KEY(application_id)
        REFERENCES monitored_applications(id)
        ON DELETE CASCADE,
    CONSTRAINT uk_metric_name_app UNIQUE (name, application_id)
);

-- Table for Metric Data points
CREATE TABLE metric_data (
    id BIGSERIAL PRIMARY KEY,
    metric_id BIGINT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    tags TEXT, -- Store as JSONB or structured key-value pairs if more complex queries needed
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_metric
        FOREIGN KEY(metric_id)
        REFERENCES metrics(id)
        ON DELETE CASCADE
);

-- Indexes for query optimization
CREATE INDEX idx_application_name ON monitored_applications (name);
CREATE INDEX idx_application_api_key ON monitored_applications (api_key);
CREATE INDEX idx_metric_application_id ON metrics (application_id);
CREATE INDEX idx_metric_data_metric_id ON metric_data (metric_id);
CREATE INDEX idx_metric_data_timestamp ON metric_data (timestamp);
CREATE INDEX idx_metric_data_metric_id_timestamp ON metric_data (metric_id, timestamp);

-- Add comments for better documentation
COMMENT ON TABLE monitored_applications IS 'Stores information about applications being monitored.';
COMMENT ON COLUMN monitored_applications.api_key IS 'Unique API key for external systems to send data.';
COMMENT ON TABLE metrics IS 'Defines specific metrics to be tracked for an application.';
COMMENT ON COLUMN metrics.type IS 'Type of metric (e.g., GAUGE, COUNTER, HISTOGRAM).';
COMMENT ON TABLE metric_data IS 'Stores time-series data points for each metric.';
COMMENT ON COLUMN metric_data.tags IS 'Optional tags for filtering/categorization (e.g., environment, region).';