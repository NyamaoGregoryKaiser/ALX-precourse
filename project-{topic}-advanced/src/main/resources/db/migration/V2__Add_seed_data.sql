-- Insert roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert default admin user (password: adminpass)
INSERT INTO users (username, password, email)
VALUES ('admin', '$2a$10$w0u3h9c9b5f5D3e5T4d2q.J2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u', 'admin@example.com') -- Hashed 'adminpass'
ON CONFLICT (username) DO NOTHING;

-- Insert default regular user (password: userpass)
INSERT INTO users (username, password, email)
VALUES ('testuser', '$2a$10$X8L2W2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f', 'user@example.com') -- Hashed 'userpass'
ON CONFLICT (username) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'testuser' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (name, description, created_at, updated_at)
VALUES ('Backend API Development', 'Develop the core RESTful API for the task management platform.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (name, description, created_at, updated_at)
VALUES ('Frontend UI Design', 'Design and implement the user interface for the platform.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign users to projects (example: admin and testuser assigned to Backend API)
INSERT INTO project_users (project_id, user_id)
SELECT p.id, u.id FROM projects p, users u
WHERE p.name = 'Backend API Development' AND u.username = 'admin'
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO project_users (project_id, user_id)
SELECT p.id, u.id FROM projects p, users u
WHERE p.name = 'Backend API Development' AND u.username = 'testuser'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (title, description, status, priority, due_date, project_id, reporter_id, assignee_id, created_at, updated_at)
SELECT
    'Implement User Authentication',
    'Develop JWT-based authentication and authorization system.',
    'IN_PROGRESS', 'HIGH',
    NOW() + INTERVAL '7 days',
    (SELECT id FROM projects WHERE name = 'Backend API Development'),
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM users WHERE username = 'testuser'),
    NOW(), NOW()
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (title, description, status, priority, due_date, project_id, reporter_id, assignee_id, created_at, updated_at)
SELECT
    'Design Database Schema',
    'Create initial database tables for users, projects, and tasks.',
    'DONE', 'MEDIUM',
    NOW() - INTERVAL '3 days',
    (SELECT id FROM projects WHERE name = 'Backend API Development'),
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM users WHERE username = 'admin'),
    NOW(), NOW()
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (title, description, status, priority, due_date, project_id, reporter_id, created_at, updated_at)
SELECT
    'Develop Project CRUD Endpoints',
    'Implement REST endpoints for creating, retrieving, updating, and deleting projects.',
    'OPEN', 'MEDIUM',
    NOW() + INTERVAL '14 days',
    (SELECT id FROM projects WHERE name = 'Backend API Development'),
    (SELECT id FROM users WHERE username = 'testuser'),
    NOW(), NOW()
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (title, description, status, priority, due_date, project_id, reporter_id, created_at, updated_at)
SELECT
    'Create Wireframes for Dashboard',
    'Design initial wireframes for the user dashboard.',
    'OPEN', 'LOW',
    NOW() + INTERVAL '5 days',
    (SELECT id FROM projects WHERE name = 'Frontend UI Design'),
    (SELECT id FROM users WHERE username = 'admin'),
    NOW(), NOW()
ON CONFLICT (id) DO NOTHING;
```