```sql
-- V2__insert_seed_data.sql

-- Insert default users
-- Passwords are 'password123' for user1, and 'admin123' for admin, encoded with BCrypt
INSERT INTO users (username, email, password, created_at, updated_at) VALUES
('user1', 'user1@example.com', '$2a$10$wE7y3z.S.o.E.jZ0b.Q5.ueO7YfV6j.u.s.t.j.x.L.o.c.A.d.J.k.h.g.P.O.0', NOW(), NOW()), -- password123
('user2', 'user2@example.com', '$2a$10$wE7y3z.S.o.E.jZ0b.Q5.ueO7YfV6j.u.s.t.j.x.L.o.c.A.d.J.k.h.g.P.O.0', NOW(), NOW()), -- password123
('admin', 'admin@example.com', '$2a$10$3z.S.o.E.jZ0b.Q5.ueO7YfV6j.u.s.t.j.x.L.o.c.A.d.J.k.h.g.P.O.0.u.x', NOW(), NOW()); -- admin123

-- Assign roles
INSERT INTO user_roles (user_id, roles) VALUES
((SELECT id FROM users WHERE username = 'user1'), 'ROLE_USER'),
((SELECT id FROM users WHERE username = 'user2'), 'ROLE_USER'),
((SELECT id FROM users WHERE username = 'admin'), 'ROLE_USER'),
((SELECT id FROM users WHERE username = 'admin'), 'ROLE_ADMIN');

-- Insert sample projects for user1
INSERT INTO projects (name, description, start_date, end_date, owner_id, created_at, updated_at) VALUES
('Website Redesign', 'Redesign the company website with a modern look and improved UX.', '2023-01-15', '2023-06-30', (SELECT id FROM users WHERE username = 'user1'), NOW(), NOW()),
('Mobile App Development', 'Develop a new mobile application for iOS and Android platforms.', '2023-03-01', '2023-12-31', (SELECT id FROM users WHERE username = 'user1'), NOW(), NOW());

-- Insert sample projects for user2
INSERT INTO projects (name, description, start_date, end_date, owner_id, created_at, updated_at) VALUES
('API Integration Project', 'Integrate with third-party APIs for data synchronization.', '2023-04-01', '2023-09-30', (SELECT id FROM users WHERE username = 'user2'), NOW(), NOW());

-- Insert sample tasks for Website Redesign project (owned by user1)
INSERT INTO tasks (title, description, project_id, assigned_to_user_id, status, due_date, created_at, updated_at) VALUES
('Design Mockups', 'Create initial wireframes and high-fidelity mockups for key pages.', (SELECT id FROM projects WHERE name = 'Website Redesign'), (SELECT id FROM users WHERE username = 'user1'), 'IN_PROGRESS', '2023-02-28', NOW(), NOW()),
('Develop Frontend', 'Implement the user interface using React and modern CSS frameworks.', (SELECT id FROM projects WHERE name = 'Website Redesign'), (SELECT id FROM users WHERE username = 'user2'), 'TO_DO', '2023-05-15', NOW(), NOW()),
('Backend API Development', 'Build RESTful APIs for data management and user authentication.', (SELECT id FROM projects WHERE name = 'Website Redesign'), (SELECT id FROM users WHERE username = 'user1'), 'TO_DO', '2023-04-30', NOW(), NOW()),
('Database Setup', 'Configure PostgreSQL database and initial schema.', (SELECT id FROM projects WHERE name = 'Website Redesign'), (SELECT id FROM users WHERE username = 'user1'), 'DONE', '2023-01-30', NOW(), NOW());

-- Insert sample tasks for Mobile App Development project (owned by user1)
INSERT INTO tasks (title, description, project_id, assigned_to_user_id, status, due_date, created_at, updated_at) VALUES
('Plan Features', 'Define core features and user stories for the mobile app.', (SELECT id FROM projects WHERE name = 'Mobile App Development'), (SELECT id FROM users WHERE username = 'user1'), 'IN_PROGRESS', '2023-03-31', NOW(), NOW()),
('Develop iOS App', 'Implement the iOS version of the mobile application.', (SELECT id FROM projects WHERE name = 'Mobile App Development'), (SELECT id FROM users WHERE username = 'user2'), 'TO_DO', '2023-08-31', NOW(), NOW());
```