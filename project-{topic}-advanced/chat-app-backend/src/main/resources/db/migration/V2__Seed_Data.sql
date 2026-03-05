```sql
-- Seed Users
INSERT INTO users (username, email, password, created_at, updated_at) VALUES
('admin', 'admin@example.com', '$2a$10$22n.337qHq4h/w5oJqX6d.Y9WJz0f/Z9L.R4l8L0f/T2X7x.8Y7j.C', NOW(), NOW()), -- password is 'adminpass'
('alice', 'alice@example.com', '$2a$10$bI.m6.4sJ.L4l8L0f/T2X7x.8Y7j.CqHq4h/w5oJqX6d.Y9WJz0f/Z9', NOW(), NOW()), -- password is 'password'
('bob', 'bob@example.com', '$2a$10$x.Y9WJz0f/Z9L.R4l8L0f/T2X7x.8Y7j.CqHq4h/w5oJqX6d.Y9WJz0f', NOW(), NOW()); -- password is 'password'

-- Seed User Roles
INSERT INTO user_roles (user_id, role) VALUES
((SELECT id FROM users WHERE username = 'admin'), 'ADMIN'),
((SELECT id FROM users WHERE username = 'admin'), 'USER'),
((SELECT id FROM users WHERE username = 'alice'), 'USER'),
((SELECT id FROM users WHERE username = 'bob'), 'USER');

-- Seed Rooms
INSERT INTO rooms (name, description, creator_id, created_at, updated_at) VALUES
('General Chat', 'A public room for general discussions.', (SELECT id FROM users WHERE username = 'admin'), NOW(), NOW()),
('Dev Talk', 'Discussions about development and coding.', (SELECT id FROM users WHERE username = 'alice'), NOW(), NOW());

-- Seed User-Room Memberships (Creator automatically joins)
INSERT INTO user_room (user_id, room_id) VALUES
((SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM rooms WHERE name = 'General Chat')),
((SELECT id FROM users WHERE username = 'alice'), (SELECT id FROM rooms WHERE name = 'General Chat')),
((SELECT id FROM users WHERE username = 'bob'), (SELECT id FROM rooms WHERE name = 'General Chat')),
((SELECT id FROM users WHERE username = 'alice'), (SELECT id FROM rooms WHERE name = 'Dev Talk'));

-- Alice and Bob join Dev Talk
INSERT INTO user_room (user_id, room_id) VALUES
((SELECT id FROM users WHERE username = 'bob'), (SELECT id FROM rooms WHERE name = 'Dev Talk'));

-- Seed Messages
INSERT INTO messages (sender_id, room_id, content, timestamp) VALUES
((SELECT id FROM users WHERE username = 'alice'), (SELECT id FROM rooms WHERE name = 'General Chat'), 'Hello everyone!', NOW() - INTERVAL '5 minutes'),
((SELECT id FROM users WHERE username = 'bob'), (SELECT id FROM rooms WHERE name = 'General Chat'), 'Hi Alice!', NOW() - INTERVAL '4 minutes'),
((SELECT id FROM users WHERE username = 'admin'), (SELECT id FROM rooms WHERE name = 'General Chat'), 'Welcome to the chat!', NOW() - INTERVAL '3 minutes'),
((SELECT id FROM users WHERE username = 'alice'), (SELECT id FROM rooms WHERE name = 'Dev Talk'), 'Anyone working on a new Spring Boot project?', NOW() - INTERVAL '2 minutes'),
((SELECT id FROM users WHERE username = 'bob'), (SELECT id FROM rooms WHERE name = 'Dev Talk'), 'Yes, I am! Using WebFlux this time.', NOW() - INTERVAL '1 minute');

```