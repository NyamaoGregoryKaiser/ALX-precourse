-- data.sql - Seed initial data for development/testing

-- Insert roles if not already present by migration (redundant with ON CONFLICT DO NOTHING but harmless)
INSERT INTO roles (name) VALUES ('ADMIN') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('MONITORING_AGENT') ON CONFLICT (name) DO NOTHING;

-- Insert a default admin user if not exists (password 'adminpass' encrypted with BCrypt)
INSERT INTO users (username, password, email, enabled)
VALUES ('admin', '$2a$10$T80j9vB8.6sQ6o.uYyVz3.b2H1a/Q7mQ4o.y/N.G.P.B.S.P.R.P.R.Q.', 'admin@appinsight.com', TRUE) -- password is 'adminpass'
ON CONFLICT (username) DO NOTHING;

-- Assign ADMIN role to the default admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert a default regular user if not exists (password 'userpass' encrypted with BCrypt)
INSERT INTO users (username, password, email, enabled)
VALUES ('user', '$2a$10$R/S6X.v5J.K.U.V8N.M.L.Q.G.B.V.V.H.S.K.L.P.P.M.Y.N.Z.', 'user@appinsight.com', TRUE) -- password is 'userpass'
ON CONFLICT (username) DO NOTHING;

-- Assign USER role to the default regular user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'user' AND r.name = 'USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert sample applications if not exists
INSERT INTO monitored_applications (name, description, api_key)
VALUES ('WebApp_Prod', 'Production web application monitoring', 'sample-api-key-webprod-1')
ON CONFLICT (name) DO NOTHING;

INSERT INTO monitored_applications (name, description, api_key)
VALUES ('Backend_Service_Dev', 'Development backend service monitoring', 'sample-api-key-backenddev-2')
ON CONFLICT (name) DO NOTHING;

-- Insert sample metrics for WebApp_Prod
WITH app_id AS (SELECT id FROM monitored_applications WHERE name = 'WebApp_Prod')
INSERT INTO metrics (application_id, name, description, type)
SELECT app_id.id, 'cpu_usage', 'Current CPU usage percentage', 'GAUGE' FROM app_id
ON CONFLICT (name, application_id) DO NOTHING;

WITH app_id AS (SELECT id FROM monitored_applications WHERE name = 'WebApp_Prod')
INSERT INTO metrics (application_id, name, description, type)
SELECT app_id.id, 'memory_usage', 'Current memory usage in MB', 'GAUGE' FROM app_id
ON CONFLICT (name, application_id) DO NOTHING;

WITH app_id AS (SELECT id FROM monitored_applications WHERE name = 'WebApp_Prod')
INSERT INTO metrics (application_id, name, description, type)
SELECT app_id.id, 'request_latency_ms', 'Average request latency in milliseconds', 'GAUGE' FROM app_id
ON CONFLICT (name, application_id) DO NOTHING;

WITH app_id AS (SELECT id FROM monitored_applications WHERE name = 'WebApp_Prod')
INSERT INTO metrics (application_id, name, description, type)
SELECT app_id.id, 'error_count', 'Cumulative count of errors', 'COUNTER' FROM app_id
ON CONFLICT (name, application_id) DO NOTHING;