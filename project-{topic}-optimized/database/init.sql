-- init.sql
-- This script sets up the initial database schema for the CMS.

-- Enable UUID-OSSP for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Store bcrypt hash
    role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- e.g., 'admin', 'editor', 'viewer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by username and email
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. Content Table
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly identifier
    body TEXT NOT NULL,
    author_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'published', 'archived'
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups by slug, author, and status
CREATE INDEX IF NOT EXISTS idx_content_slug ON content (slug);
CREATE INDEX IF NOT EXISTS idx_content_author_id ON content (author_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content (status);

-- 3. Media Files Table
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(255) UNIQUE NOT NULL, -- Relative path to storage
    mimetype VARCHAR(100) NOT NULL,
    filesize_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL -- If user deleted, keep file info
);

-- Index for faster lookups by filename and uploader
CREATE INDEX IF NOT EXISTS idx_media_filename ON media_files (filename);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media_files (uploaded_by);

-- Function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at') THEN
        CREATE TRIGGER set_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_content_updated_at') THEN
        CREATE TRIGGER set_content_updated_at
        BEFORE UPDATE ON content
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
```