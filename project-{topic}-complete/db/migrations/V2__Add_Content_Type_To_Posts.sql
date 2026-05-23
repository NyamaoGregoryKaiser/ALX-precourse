```sql
-- V2__Add_Content_Type_To_Posts.sql
-- Adds a new column 'content_type' to the posts table.

ALTER TABLE posts
ADD COLUMN content_type VARCHAR(50) DEFAULT 'markdown';

-- Update existing rows to a default value if desired (e.g., if content was previously all HTML)
-- UPDATE posts SET content_type = 'html' WHERE content LIKE '%<%' AND content_type IS NULL;
-- For this CMS, we assume 'markdown' as default.
```