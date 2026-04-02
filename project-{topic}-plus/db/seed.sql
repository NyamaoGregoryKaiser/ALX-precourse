```sql
-- Seed data for initial setup

-- Users
INSERT INTO users (username, password_hash, email, role) VALUES
('admin', '$2a$10$wTf/0rQjJz9/vFq2y1x.Z.S.J.S.J.S.J.S.J.S.J.S.J.S.J.S', 'admin@example.com', 'admin'), -- Password 'adminpass'
('testuser', '$2a$10$uA9yR6L7vB8cZ9x/0zK.Z.S.J.S.J.S.J.S.J.S.J.S.J.S.J.S', 'testuser@example.com', 'user'), -- Password 'userpass'
('john.doe', '$2a$10$xyz/0rQjJz9/vFq2y1x.Z.S.J.S.J.S.J.S.J.S.J.S.J.S.J.S', 'john.doe@example.com', 'user'); -- Password 'johnpass'

-- Projects
INSERT INTO projects (name, description, owner_id) VALUES
('Website Redesign', 'Redesign the company website with a modern look and feel.', (SELECT id FROM users WHERE username = 'admin')),
('Mobile App Development', 'Develop a new mobile application for iOS and Android platforms.', (SELECT id FROM users WHERE username = 'testuser'));

-- Tasks for Website Redesign (Project 1)
INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, due_date) VALUES
('Design Homepage', 'Create wireframes and mockups for the new homepage.', 'IN_PROGRESS', 'HIGH',
    (SELECT id FROM projects WHERE name = 'Website Redesign'),
    (SELECT id FROM users WHERE username = 'john.doe'),
    '2024-07-30 23:59:59'),
('Develop Header Component', 'Implement the responsive header component.', 'TODO', 'HIGH',
    (SELECT id FROM projects WHERE name = 'Website Redesign'),
    (SELECT id FROM users WHERE username = 'testuser'),
    '2024-08-05 23:59:59'),
('Write API Documentation', 'Document all new backend API endpoints.', 'DONE', 'MEDIUM',
    (SELECT id FROM projects WHERE name = 'Website Redesign'),
    (SELECT id FROM users WHERE username = 'admin'),
    '2024-07-15 23:59:59');

-- Tasks for Mobile App Development (Project 2)
INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, due_date) VALUES
('Setup Development Environment', 'Configure IDEs, SDKs, and emulators.', 'DONE', 'HIGH',
    (SELECT id FROM projects WHERE name = 'Mobile App Development'),
    (SELECT id FROM users WHERE username = 'testuser'),
    '2024-07-20 23:59:59'),
('Implement User Authentication', 'Develop login, registration, and session management.', 'IN_PROGRESS', 'HIGH',
    (SELECT id FROM projects WHERE name = 'Mobile App Development'),
    (SELECT id FROM users WHERE username = 'john.doe'),
    '2024-08-10 23:59:59');
```