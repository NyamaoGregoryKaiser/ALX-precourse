-- V1__Initial_Schema.sql
-- This script sets up the initial schema for the authentication system.

-- Create the _user table
-- Using "_user" to avoid potential conflicts with reserved SQL keywords like "user".
CREATE TABLE IF NOT EXISTS _user (
    id BIGSERIAL PRIMARY KEY,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- Storing role as a string (e.g., 'USER', 'ADMIN')
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

-- Add indexes for frequently queried columns to improve performance
CREATE INDEX IF NOT EXISTS idx_user_email ON _user (email);

-- Comments on table and columns
COMMENT ON TABLE _user IS 'Stores user accounts and their authentication details.';
COMMENT ON COLUMN _user.id IS 'Unique identifier for the user.';
COMMENT ON COLUMN _user.firstname IS 'User''s first name.';
COMMENT ON COLUMN _user.lastname IS 'User''s last name.';
COMMENT ON COLUMN _user.email IS 'Unique email address of the user, used as username.';
COMMENT ON COLUMN _user.password IS 'Hashed password of the user.';
COMMENT ON COLUMN _user.role IS 'Role of the user (e.g., USER, ADMIN).';
COMMENT ON COLUMN _user.created_at IS 'Timestamp when the user account was created.';
COMMENT ON COLUMN _user.updated_at IS 'Timestamp when the user account was last updated.';

-- You might also have a refresh token table in a more complex setup:
/*
CREATE TABLE IF NOT EXISTS refresh_token (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES _user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON refresh_token (user_id);
*/