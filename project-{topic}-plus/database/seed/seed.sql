-- seed.sql

-- Seed Users
INSERT INTO users (id, username, email, password_hash, created_at) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'adminuser', 'admin@example.com', 'hashed_admin_password_123', NOW()),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'john_doe', 'john@example.com', 'hashed_john_password_456', NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'jane_smith', 'jane@example.com', 'hashed_jane_password_789', NOW());

-- Seed Teams
INSERT INTO teams (id, name, description, created_at) VALUES
    ('t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Frontend Team', 'Team responsible for UI/UX development', NOW()),
    ('t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Backend Team', 'Team responsible for API and database development', NOW()),
    ('t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'QA Team', 'Team responsible for quality assurance and testing', NOW());

-- Seed User-Team relationships
INSERT INTO user_team (user_id, team_id) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'), -- adminuser in Backend Team
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), -- john_doe in Frontend Team
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'), -- john_doe also in Backend Team
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'); -- jane_smith in QA Team

-- Seed Projects
INSERT INTO projects (id, name, description, start_date, end_date, status, owner_id, team_id, created_at) VALUES
    ('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Website Redesign', 'Complete overhaul of the company website', '2023-01-01', '2023-06-30', 'in-progress', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()),
    ('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'API Development', 'Develop new REST API for mobile app', '2023-02-15', '2023-08-31', 'planning', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 't0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Mobile App V1', 'First version of the cross-platform mobile application', '2023-03-01', '2023-12-31', 'in-progress', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NULL, NOW()); -- No specific team yet

-- Seed User-Project relationships (initial project members)
INSERT INTO user_project (user_id, project_id, role) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin'), -- adminuser owns Website Redesign
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'member'), -- john_doe is member of Website Redesign
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'admin'), -- adminuser owns API Development
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'member'), -- jane_smith is member of API Development
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'admin'); -- john_doe owns Mobile App V1

-- Seed Tasks
INSERT INTO tasks (id, project_id, title, description, due_date, status, assigned_to_id, created_at) VALUES
    ('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Design new homepage layout', 'Create wireframes and mockups for the new homepage', '2023-01-15', 'done', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Implement responsive navigation', 'Develop front-end code for the new navigation bar', '2023-02-10', 'in-progress', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW()),
    ('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Define API endpoints for user authentication', 'Document /auth/register and /auth/login endpoints', '2023-03-01', 'todo', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()),
    ('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Implement JWT token generation', 'Write backend code for JWT creation and signing', '2023-03-15', 'in-progress', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()),
    ('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Set up mobile development environment', 'Install React Native, Android Studio, Xcode', '2023-03-10', 'done', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', NOW());
```