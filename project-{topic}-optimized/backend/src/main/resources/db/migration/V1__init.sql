```sql
-- V1__init.sql

-- Create Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Channels table
CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    creator_id BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_channel_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Channel_Members (join table for many-to-many relationship between users and channels)
CREATE TABLE channel_members (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_channel UNIQUE (user_id, channel_id) -- A user can join a channel only once
);

-- Create Messages table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_message_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for query optimization
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_channels_name ON channels (name);
CREATE INDEX idx_channel_members_user_id ON channel_members (user_id);
CREATE INDEX idx_channel_members_channel_id ON channel_members (channel_id);
CREATE INDEX idx_messages_channel_id ON messages (channel_id);
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_timestamp ON messages (timestamp);

-- Seed data (optional, for initial setup)
INSERT INTO users (username, email, password, created_at) VALUES
    ('alxuser1', 'user1@alx.com', '$2a$10$T8.uL1uY6V.J5wD0oK0W.uF.X9E.q.Z1p.g0P.p2V.K1f.cM.m7bL', CURRENT_TIMESTAMP), -- password: password123
    ('alxuser2', 'user2@alx.com', '$2a$10$T8.uL1uY6V.J5wD0oK0W.uF.X9E.q.Z1p.g0P.p2V.K1f.cM.m7bL', CURRENT_TIMESTAMP);

INSERT INTO channels (name, creator_id, created_at) VALUES
    ('general', (SELECT id FROM users WHERE username = 'alxuser1'), CURRENT_TIMESTAMP),
    ('tech-talk', (SELECT id FROM users WHERE username = 'alxuser2'), CURRENT_TIMESTAMP);

INSERT INTO channel_members (user_id, channel_id, joined_at) VALUES
    ((SELECT id FROM users WHERE username = 'alxuser1'), (SELECT id FROM channels WHERE name = 'general'), CURRENT_TIMESTAMP),
    ((SELECT id FROM users WHERE username = 'alxuser2'), (SELECT id FROM channels WHERE name = 'general'), CURRENT_TIMESTAMP),
    ((SELECT id FROM users WHERE username = 'alxuser2'), (SELECT id FROM channels WHERE name = 'tech-talk'), CURRENT_TIMESTAMP);

INSERT INTO messages (channel_id, sender_id, content, timestamp) VALUES
    ((SELECT id FROM channels WHERE name = 'general'), (SELECT id FROM users WHERE username = 'alxuser1'), 'Hello everyone!', CURRENT_TIMESTAMP - INTERVAL '2 minute'),
    ((SELECT id FROM channels WHERE name = 'general'), (SELECT id FROM users WHERE username = 'alxuser2'), 'Hi alxuser1!', CURRENT_TIMESTAMP - INTERVAL '1 minute'),
    ((SELECT id FROM channels WHERE name = 'tech-talk'), (SELECT id FROM users WHERE username = 'alxuser2'), 'Any cool tech news?', CURRENT_TIMESTAMP);
```

### Frontend - React (TypeScript, Chakra UI)

The frontend provides a basic chat interface with login, registration, channel listing, joining, and real-time messaging.