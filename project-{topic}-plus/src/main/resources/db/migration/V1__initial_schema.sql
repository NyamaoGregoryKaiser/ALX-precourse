```sql
-- V1__initial_schema.sql
-- Initial schema for the Data Visualization Tool

-- Table for application users
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table for user roles (many-to-many relationship simplified with ElementCollection in JPA)
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role),
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- Table for data sources
CREATE TABLE data_source (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    connection_details TEXT NOT NULL, -- e.g., CSV path, DB connection string, API endpoint
    type VARCHAR(50) NOT NULL,       -- e.g., CSV, DATABASE, API
    schema_definition TEXT,          -- JSON schema of the data
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- Table for dashboards
CREATE TABLE dashboard (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES app_user(id) ON DELETE CASCADE
);

-- Table for charts
CREATE TABLE chart (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,         -- e.g., BAR, LINE, PIE, SCATTER, TABLE
    configuration TEXT,                -- JSON string for chart configuration (e.g., x-axis, y-axis, colors)
    data_source_id BIGINT NOT NULL,
    dashboard_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (data_source_id) REFERENCES data_source(id) ON DELETE RESTRICT, -- Don't delete data source if charts depend on it
    FOREIGN KEY (dashboard_id) REFERENCES dashboard(id) ON DELETE CASCADE
);

-- Seed Data
INSERT INTO app_user (username, password, email, created_at, updated_at) VALUES
('admin', '$2a$10$iKq11B8iQ1c.90b0sC3.0.b.p.P2.0o0.0.0.0.0.0.0.0.0.0.0.0.0.0.0', 'admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- password: password
('user1', '$2a$10$iKq11B8iQ1c.90b0sC3.0.b.p.P2.0o0.0.0.0.0.0.0.0.0.0.0.0.0.0.0', 'user1@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); -- password: password

INSERT INTO user_roles (user_id, role) VALUES
((SELECT id FROM app_user WHERE username = 'admin'), 'ADMIN'),
((SELECT id FROM app_user WHERE username = 'admin'), 'USER'),
((SELECT id FROM app_user WHERE username = 'user1'), 'USER');

INSERT INTO data_source (name, connection_details, type, schema_definition, owner_id, created_at, updated_at) VALUES
('Sales Data', 'path/to/sales.csv', 'CSV', '{"columns": [{"name": "product", "type": "string"}, {"name": "sales", "type": "number"}]}', (SELECT id FROM app_user WHERE username = 'user1'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Customers DB', 'jdbc:postgresql://host:port/db?user=u&password=p', 'DATABASE', '{"columns": [{"name": "id", "type": "number"}, {"name": "name", "type": "string"}]}', (SELECT id FROM app_user WHERE username = 'admin'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Product Metrics API', 'https://api.example.com/metrics', 'API', '{"fields": {"metricName": "string", "value": "number"}}', (SELECT id FROM app_user WHERE username = 'user1'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO dashboard (name, description, owner_id, created_at, updated_at) VALUES
('User1 Sales Overview', 'Dashboard displaying sales performance for user1', (SELECT id FROM app_user WHERE username = 'user1'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Admin Global View', 'Admin dashboard for overall system metrics', (SELECT id FROM app_user WHERE username = 'admin'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO chart (title, description, type, configuration, data_source_id, dashboard_id, created_at, updated_at) VALUES
('Monthly Sales Bar Chart', 'Bar chart showing monthly sales by product', 'BAR', '{"xAxis": "product", "yAxis": "sales", "color": "category"}', (SELECT id FROM data_source WHERE name = 'Sales Data'), (SELECT id FROM dashboard WHERE name = 'User1 Sales Overview'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Customer Growth Line Chart', 'Line chart for customer growth over time', 'LINE', '{"xAxis": "date", "yAxis": "count"}', (SELECT id FROM data_source WHERE name = 'Customers DB'), (SELECT id FROM dashboard WHERE name = 'Admin Global View'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```