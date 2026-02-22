```sql
-- V2__Add_seed_data.sql

-- Insert initial users
INSERT INTO users (username, email, password, created_at) VALUES
('adminuser', 'admin@alx.com', '$2a$10$iM.o3t6S9pD8N2g.0W.s0u8wK2dJ4oO5fP6qG7hE8I9j/V0c.5O6', CURRENT_TIMESTAMP), -- password: adminpass
('testuser1', 'test1@alx.com', '$2a$10$iM.o3t6S9pD8N2g.0W.s0u8wK2dJ4oO5fP6qG7hE8I9j/V0c.5O6', CURRENT_TIMESTAMP), -- password: testpass
('testuser2', 'test2@alx.com', '$2a$10$iM.o3t6S9pD8N2g.0W.s0u8wK2dJ4oO5fP6qG7hE8I9j/V0c.5O6', CURRENT_TIMESTAMP); -- password: testpass

-- Assign roles
INSERT INTO user_roles (user_id, role) VALUES
((SELECT id FROM users WHERE username = 'adminuser'), 'ROLE_ADMIN'),
((SELECT id FROM users WHERE username = 'adminuser'), 'ROLE_USER'),
((SELECT id FROM users WHERE username = 'testuser1'), 'ROLE_USER'),
((SELECT id FROM users WHERE username = 'testuser2'), 'ROLE_USER');

-- Insert initial chat rooms
INSERT INTO chat_rooms (name, type, creator_id, created_at) VALUES
('General', 'PUBLIC', (SELECT id FROM users WHERE username = 'adminuser'), CURRENT_TIMESTAMP),
('Dev Talk', 'PUBLIC', (SELECT id FROM users WHERE username = 'testuser1'), CURRENT_TIMESTAMP),
('Private Lounge', 'PRIVATE', (SELECT id FROM users WHERE username = 'testuser1'), CURRENT_TIMESTAMP);

-- Add members to rooms
-- Admin and testuser1 join General
INSERT INTO room_members (user_id, room_id, is_admin, joined_at) VALUES
((SELECT id FROM users WHERE username = 'adminuser'), (SELECT id FROM chat_rooms WHERE name = 'General'), TRUE, CURRENT_TIMESTAMP),
((SELECT id FROM users WHERE username = 'testuser1'), (SELECT id FROM chat_rooms WHERE name = 'General'), FALSE, CURRENT_TIMESTAMP);

-- testuser1 and testuser2 join Dev Talk
INSERT INTO room_members (user_id, room_id, is_admin, joined_at) VALUES
((SELECT id FROM users WHERE username = 'testuser1'), (SELECT id FROM chat_rooms WHERE name = 'Dev Talk'), TRUE, CURRENT_TIMESTAMP),
((SELECT id FROM users WHERE username = 'testuser2'), (SELECT id FROM chat_rooms WHERE name = 'Dev Talk'), FALSE, CURRENT_TIMESTAMP);

-- testuser1 (creator) joins Private Lounge
INSERT INTO room_members (user_id, room_id, is_admin, joined_at) VALUES
((SELECT id FROM users WHERE username = 'testuser1'), (SELECT id FROM chat_rooms WHERE name = 'Private Lounge'), TRUE, CURRENT_TIMESTAMP);

-- Insert sample messages
INSERT INTO messages (room_id, sender_id, content, sent_at) VALUES
((SELECT id FROM chat_rooms WHERE name = 'General'), (SELECT id FROM users WHERE username = 'adminuser'), 'Welcome to the General chat!', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
((SELECT id FROM chat_rooms WHERE name = 'General'), (SELECT id FROM users WHERE username = 'testuser1'), 'Hey everyone!', CURRENT_TIMESTAMP - INTERVAL '8 minutes'),
((SELECT id FROM chat_rooms WHERE name = 'Dev Talk'), (SELECT id FROM users WHERE username = 'testuser1'), 'Anyone here working on the new feature?', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
((SELECT id FROM chat_rooms WHERE name = 'Dev Talk'), (SELECT id FROM users WHERE username = 'testuser2'), 'Yep, I am. Need help?', CURRENT_TIMESTAMP - INTERVAL '3 minutes');
```