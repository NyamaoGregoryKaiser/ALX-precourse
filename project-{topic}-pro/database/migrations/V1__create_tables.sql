-- This is an example of a migration script. In a real system, you'd use FlywayDB, Liquibase,
-- or custom scripts to manage schema changes incrementally.
-- For this initial setup, it includes the full schema.
-- Subsequent migrations would be named V2__add_feature_x.sql, V3__alter_table_y.sql, etc.

-- If using a tool like Flyway, this would be `V1__create_tables.sql`
-- and Flyway would manage applying it.

-- Create UUID extension if not exists (for future use, if IDs are UUIDs)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- e.g., 'guest', 'user', 'editor', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table (for content categorization)
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE, -- URL-friendly version of name
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content Table (Articles, Pages, Blog Posts)
CREATE TABLE IF NOT EXISTS content (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE, -- URL-friendly version of title
    body TEXT NOT NULL,
    summary TEXT,
    image_url VARCHAR(512),
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'published', 'archived'
    type VARCHAR(50) NOT NULL DEFAULT 'post', -- e.g., 'post', 'page'
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL, -- Content can exist without a category
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    author_id BIGINT REFERENCES users(id) ON DELETE SET NULL, -- If user is deleted, comments remain (anonymous)
    content_id BIGINT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE, -- For nested comments
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_content_slug ON content (slug);
CREATE INDEX IF NOT EXISTS idx_content_author_id ON content (author_id);
CREATE INDEX IF NOT EXISTS idx_content_category_id ON content (category_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content (status);
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments (content_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments (author_id);