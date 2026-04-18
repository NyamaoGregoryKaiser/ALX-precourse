-- V2__add_roles_and_seed_data.sql

-- Update project_owner_id to be NOT NULL as per business logic
-- ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL; -- This was already set in V1

-- Add a default role for existing users in projects if not already specified in V1
-- No specific changes needed if V1 already defined DEFAULT 'member' for user_project.role

-- Ensure 'updated_at' columns are updated automatically
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
```