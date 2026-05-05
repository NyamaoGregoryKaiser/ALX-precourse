-- V2__seed_data.sql
-- This migration will insert initial data for demonstration purposes.
-- In a real production environment, seed data might be handled differently,
-- especially for sensitive information like user credentials.

-- Insert initial users (passwords are 'password' for testing, encoded with BCrypt)
INSERT INTO users (id, username, password, status, created_at) VALUES
    (1, 'alice', '$2a$10$TjG0tL3t.5b0V1r.zS2.q.W.S1.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q', 'OFFLINE', NOW()),
    (2, 'bob', '$2a$10$TjG0tL3t.5b0V1r.zS2.q.W.S1.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q', 'OFFLINE', NOW()),
    (3, 'charlie', '$2a$10$TjG0tL3t.5b0V1r.zS2.q.W.S1.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q', 'OFFLINE', NOW());

-- Reset sequence for users to avoid conflicts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Insert initial chat rooms
INSERT INTO chat_rooms (id, name, creator_id, created_at) VALUES
    (101, 'General Chat', 1, NOW()),
    (102, 'Dev Discussion', 1, NOW());

-- Reset sequence for chat_rooms
SELECT setval('chat_rooms_id_seq', (SELECT MAX(id) FROM chat_rooms));

-- Add participants to rooms
INSERT INTO room_participants (room_id, user_id, joined_at) VALUES
    (101, 1, NOW()), -- Alice in General Chat
    (101, 2, NOW()), -- Bob in General Chat
    (102, 1, NOW()), -- Alice in Dev Discussion
    (102, 3, NOW()); -- Charlie in Dev Discussion

-- Reset sequence for room_participants
SELECT setval('room_participants_id_seq', (SELECT MAX(id) FROM room_participants));

-- Insert some initial messages
INSERT INTO messages (room_id, sender_id, content, timestamp) VALUES
    (101, 1, 'Hello everyone in General Chat!', NOW() - INTERVAL '5 minutes'),
    (101, 2, 'Hi Alice, how are you?', NOW() - INTERVAL '4 minutes'),
    (102, 1, 'Starting a new feature discussion. Any ideas?', NOW() - INTERVAL '10 minutes'),
    (102, 3, 'I''ve got a few thoughts on that, Alice!', NOW() - INTERVAL '8 minutes');

-- Reset sequence for messages
SELECT setval('messages_id_seq', (SELECT MAX(id) FROM messages));