```sql
-- seed_data.sql

-- Insert a default admin user (password 'adminpass')
-- In a real system, you'd securely prompt for this during setup or use environment variables.
-- Hashed password for 'adminpass' (using the simple PWDUtils hash logic)
INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', 'd53066a34739818b$3c4573b0696efd15', 'ADMIN');

-- Insert a default regular user (password 'userpass')
-- Hashed password for 'userpass'
INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES
('john.doe', 'john.doe@example.com', 'a3978ff8579d46f3$4c885c40682121e4', 'USER');

-- Get IDs of seeded users
-- SELECT id FROM users WHERE username = 'admin';
-- SELECT id FROM users WHERE username = 'john.doe';

-- Insert some projects
INSERT OR IGNORE INTO projects (name, description, owner_id) VALUES
('API Development', 'Build the core API for the project management system.', (SELECT id FROM users WHERE username = 'admin')),
('Frontend Design', 'Design and implement the user interface.', (SELECT id FROM users WHERE username = 'john.doe')),
('Database Optimization', 'Review and optimize database queries and schema.', (SELECT id FROM users WHERE username = 'admin'));

-- Insert some tasks
INSERT OR IGNORE INTO tasks (title, description, status, project_id, assigned_user_id) VALUES
('Implement User Auth', 'Develop JWT-based authentication endpoints.', 'IN_PROGRESS', (SELECT id FROM projects WHERE name = 'API Development'), (SELECT id FROM users WHERE username = 'admin')),
('Design UI/UX Mockups', 'Create initial wireframes and mockups for the frontend.', 'TODO', (SELECT id FROM projects WHERE name = 'Frontend Design'), (SELECT id FROM users WHERE username = 'john.doe')),
('Setup CI/CD Pipeline', 'Configure automated testing and deployment for the API.', 'TODO', (SELECT id FROM projects WHERE name = 'API Development'), (SELECT id FROM users WHERE username = 'admin')),
('Review Database Schema', 'Check for normalization and indexing opportunities.', 'DONE', (SELECT id FROM projects WHERE name = 'Database Optimization'), (SELECT id FROM users WHERE username = 'admin')),
('Build Login Page', 'Implement the login UI for users.', 'TODO', (SELECT id FROM projects WHERE name = 'Frontend Design'), (SELECT id FROM users WHERE username = 'john.doe'));

-- NOTE: The password hashes here are generated using the PWDUtils::simpleHash logic for demonstration.
-- 'adminpass' -> 'd53066a34739818b$3c4573b0696efd15'
-- 'userpass' -> 'a3978ff8579d46f3$4c885c40682121e4'
-- In a real application, never hardcode passwords or use a weak hashing function.
```