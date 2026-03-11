```sql
-- V2__add_seed_data.sql

-- Insert default admin user
-- Password for 'admin@taskmgr.com' is 'adminpassword' (bcrypt encoded)
INSERT INTO users (full_name, email, password, created_at, updated_at) VALUES
('Admin User', 'admin@taskmgr.com', '$2a$10$8.M1sXq0g.G/7JtQ4.9y/uMvX3q8M0fP0L0Z0X0W0V0U0T0S0R0Q0P0O0N0M0K0J0I0H', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- The bcrypt hash above is for "adminpassword"
-- You can generate new hashes using BCryptPasswordEncoder in a small Spring Boot app.
-- Example: new BCryptPasswordEncoder().encode("your_password")

-- Assign ADMIN role to the admin user
INSERT INTO user_roles (user_id, role)
SELECT id, 'ROLE_ADMIN' FROM users WHERE email = 'admin@taskmgr.com';
INSERT INTO user_roles (user_id, role)
SELECT id, 'ROLE_USER' FROM users WHERE email = 'admin@taskmgr.com';


-- Insert a regular user
-- Password for 'user@taskmgr.com' is 'userpassword' (bcrypt encoded)
INSERT INTO users (full_name, email, password, created_at, updated_at) VALUES
('Regular User', 'user@taskmgr.com', '$2a$10$wE.g.Z4q.Q0.L.X.T.H.R.X.H.P.Y.Z.D.Y.U.G.I.B.C.F.J.K.L.O', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- The bcrypt hash above is for "userpassword"

-- Assign USER role to the regular user
INSERT INTO user_roles (user_id, role)
SELECT id, 'ROLE_USER' FROM users WHERE email = 'user@taskmgr.com';


-- Insert some default categories
INSERT INTO categories (name, created_at, updated_at) VALUES
('Work', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Personal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Shopping', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Learning', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);


-- Insert some tasks for the regular user
INSERT INTO tasks (title, description, due_date, status, owner_id, category_id, created_at, updated_at)
SELECT
    'Complete Project Report',
    'Finalize the Q2 project report and submit to management.',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    'IN_PROGRESS',
    (SELECT id FROM users WHERE email = 'user@taskmgr.com'),
    (SELECT id FROM categories WHERE name = 'Work'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'user@taskmgr.com') AND EXISTS (SELECT 1 FROM categories WHERE name = 'Work');

INSERT INTO tasks (title, description, due_date, status, owner_id, category_id, created_at, updated_at)
SELECT
    'Buy Groceries',
    'Milk, eggs, bread, vegetables, fruits.',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    'PENDING',
    (SELECT id FROM users WHERE email = 'user@taskmgr.com'),
    (SELECT id FROM categories WHERE name = 'Shopping'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'user@taskmgr.com') AND EXISTS (SELECT 1 FROM categories WHERE name = 'Shopping');

INSERT INTO tasks (title, description, due_date, status, owner_id, category_id, created_at, updated_at)
SELECT
    'Schedule Doctor Appointment',
    'Annual check-up for the family doctor.',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    'PENDING',
    (SELECT id FROM users WHERE email = 'user@taskmgr.com'),
    (SELECT id FROM categories WHERE name = 'Health'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'user@taskmgr.com') AND EXISTS (SELECT 1 FROM categories WHERE name = 'Health');

-- Insert some tasks for the admin user
INSERT INTO tasks (title, description, due_date, status, owner_id, category_id, created_at, updated_at)
SELECT
    'Review Performance Metrics',
    'Analyze Q2 performance data and prepare presentation.',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    'IN_PROGRESS',
    (SELECT id FROM users WHERE email = 'admin@taskmgr.com'),
    (SELECT id FROM categories WHERE name = 'Work'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@taskmgr.com') AND EXISTS (SELECT 1 FROM categories WHERE name = 'Work');

INSERT INTO tasks (title, description, due_date, status, owner_id, category_id, created_at, updated_at)
SELECT
    'Setup New Server',
    'Configure new cloud server for deployment.',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    'PENDING',
    (SELECT id FROM users WHERE email = 'admin@taskmgr.com'),
    (SELECT id FROM categories WHERE name = 'Work'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@taskmgr.com') AND EXISTS (SELECT 1 FROM categories WHERE name = 'Work');

```