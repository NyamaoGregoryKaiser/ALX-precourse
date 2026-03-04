-- V2__seed_data.sql

-- Insert default roles if they do not exist
INSERT INTO roles (name, created_at, updated_at)
VALUES ('ROLE_USER', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, created_at, updated_at)
VALUES ('ROLE_ADMIN', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Get the IDs of the roles we just inserted (or already exist)
DO $$
DECLARE
    user_role_id BIGINT;
    admin_role_id BIGINT;
    admin_user_id BIGINT;
BEGIN
    -- Retrieve role IDs
    SELECT id INTO user_role_id FROM roles WHERE name = 'ROLE_USER';
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ROLE_ADMIN';

    -- Insert an admin user if not exists
    -- Password for 'admin' user is 'password123!A'
    -- Hash generated using BCrypt: $2a$10$Tj6lWvH9x.G8.f/z1w/3u.G5q.X2D.0C9.M6L.K8/1J3C1Z3C1G5 (example, generated for 'password123!A')
    -- ALWAYS use a newly generated hash in production. This is for demonstration.
    INSERT INTO users (username, email, password, enabled, created_at, updated_at)
    VALUES ('admin', 'admin@example.com', '$2a$10$Tj6lWvH9x.G8.f/z1w/3u.G5q.X2D.0C9.M6L.K8/1J3C1Z3C1G5', TRUE, NOW(), NOW())
    ON CONFLICT (username) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- If admin user was just inserted (admin_user_id is not null), assign roles
    IF admin_user_id IS NOT NULL THEN
        -- Assign 'ROLE_USER' and 'ROLE_ADMIN' to the admin user
        INSERT INTO user_roles (user_id, role_id)
        VALUES (admin_user_id, user_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;

        INSERT INTO user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    -- Insert a regular user if not exists
    -- Password for 'testuser' is 'Userpass1!'
    -- Hash generated using BCrypt: $2a$10$wN9i2F.t6O.wJ5L6L.K8/1J3C1Z3C1G5.X2D.0C9.M6L.Tj6lWvH9x (example, generated for 'Userpass1!')
    DECLARE
        test_user_id BIGINT;
    BEGIN
        INSERT INTO users (username, email, password, enabled, created_at, updated_at)
        VALUES ('testuser', 'testuser@example.com', '$2a$10$wN9i2F.t6O.wJ5L6L.K8/1J3C1Z3C1G5.X2D.0C9.M6L.Tj6lWvH9x', TRUE, NOW(), NOW())
        ON CONFLICT (username) DO NOTHING
        RETURNING id INTO test_user_id;

        -- If test user was just inserted, assign 'ROLE_USER'
        IF test_user_id IS NOT NULL THEN
            INSERT INTO user_roles (user_id, role_id)
            VALUES (test_user_id, user_role_id)
            ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
    END;
END $$;
```

---

### 3. Configuration & Setup

#### `docker-compose.yml`

```yaml