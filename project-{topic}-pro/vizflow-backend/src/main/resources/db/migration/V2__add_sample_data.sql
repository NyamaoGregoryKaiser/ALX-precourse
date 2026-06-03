```sql
-- V2__add_sample_data.sql

-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_EDITOR') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert an admin user (password 'admin123' -> bcrypt encoded)
INSERT INTO users (username, password, email, created_at, updated_at) VALUES
('admin', '$2a$10$wYq.T/5hP6j1gT6vJ/0vjO/Yp.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y', 'admin@example.com', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password, updated_at = NOW();

-- Insert a regular user (password 'user123' -> bcrypt encoded)
INSERT INTO users (username, password, email, created_at, updated_at) VALUES
('user', '$2a$10$s.J.5h/D.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y', 'user@example.com', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password, updated_at = NOW();


-- Assign roles to users
-- Note: You need to retrieve the IDs of the inserted users and roles.
-- For simplicity, we assume 'admin' is user_id 1 and 'user' is user_id 2.
-- And ROLE_ADMIN is role_id 3, ROLE_USER is role_id 1.

DO $$
DECLARE
    admin_user_id BIGINT;
    user_user_id BIGINT;
    role_admin_id BIGINT;
    role_user_id BIGINT;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO user_user_id FROM users WHERE username = 'user';
    SELECT id INTO role_admin_id FROM roles WHERE name = 'ROLE_ADMIN';
    SELECT id INTO role_user_id FROM roles WHERE name = 'ROLE_USER';

    IF admin_user_id IS NOT NULL AND role_admin_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (admin_user_id, role_admin_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    IF user_user_id IS NOT NULL AND role_user_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (user_user_id, role_user_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$;


-- Insert sample data source
DO $$
DECLARE
    admin_user_id BIGINT;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';

    IF admin_user_id IS NOT NULL THEN
        INSERT INTO data_sources (name, type, connection_details, owner_id, created_at, updated_at) VALUES
        ('Sample Sales DB', 'POSTGRES', '{"host": "db_host", "port": 5432, "database": "sales_data", "username": "db_user", "password": "db_password"}', admin_user_id, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type, connection_details = EXCLUDED.connection_details, owner_id = EXCLUDED.owner_id, updated_at = NOW();
    END IF;
END $$;

-- Insert sample dataset
DO $$
DECLARE
    admin_user_id BIGINT;
    sample_ds_id BIGINT;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO sample_ds_id FROM data_sources WHERE name = 'Sample Sales DB';

    IF admin_user_id IS NOT NULL AND sample_ds_id IS NOT NULL THEN
        INSERT INTO datasets (name, data_source_id, query_or_table, schema_definition, transformation_logic, owner_id, created_at, updated_at) VALUES
        ('Monthly Sales Overview', sample_ds_id, 'SELECT month, product_category, SUM(revenue) as total_revenue FROM sales_table GROUP BY month, product_category',
         '{"month": "STRING", "product_category": "STRING", "total_revenue": "NUMBER"}',
         '{"filters": [{"column": "total_revenue", "operator": ">", "value": 1000}], "aggregations": [{"column": "total_revenue", "type": "SUM", "alias": "aggregated_revenue", "groupBy": ["month"]}]}',
         admin_user_id, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET data_source_id = EXCLUDED.data_source_id, query_or_table = EXCLUDED.query_or_table, schema_definition = EXCLUDED.schema_definition, transformation_logic = EXCLUDED.transformation_logic, owner_id = EXCLUDED.owner_id, updated_at = NOW();
    END IF;
END $$;
```
*Note on passwords in `V2__add_sample_data.sql`: The bcrypt hashes for `admin123` and `user123` are placeholders. Generate actual ones using `BCryptPasswordEncoder` in your application or online tools. For `admin123` it's `$2a$10$wYq.T/5hP6j1gT6vJ/0vjO/Yp.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y` and for `user123` it's `$2a$10$s.J.5h/D.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y.Y`. Always use strong, randomly generated passwords in production.*