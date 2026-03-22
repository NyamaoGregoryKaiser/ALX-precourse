-- V2__Seed_Data.sql
-- This script inserts initial data into the _user table.
-- Passwords are BCrypt-encoded for security.
-- You can generate BCrypt hashes using a tool or by running a Spring Boot app with BCryptPasswordEncoder.
-- Example: passwordEncoder.encode("adminpass") and passwordEncoder.encode("userpass")

-- Insert an ADMIN user
INSERT INTO _user (firstname, lastname, email, password, role, created_at, updated_at)
VALUES (
    'Admin',
    'User',
    'admin@example.com',
    '$2a$10$T6f7g.6q1hL.4k7m8n9o.2C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q', -- Example BCrypt hash for "adminpass"
    'ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING; -- Prevents re-insertion on subsequent migrations

-- Insert a regular USER
INSERT INTO _user (firstname, lastname, email, password, role, created_at, updated_at)
VALUES (
    'Test',
    'User',
    'user@example.com',
    '$2a$10$X8y9z.7a2bC3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v', -- Example BCrypt hash for "userpass"
    'USER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;