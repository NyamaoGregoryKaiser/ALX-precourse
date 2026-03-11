--liquibase formatted sql

-- changeset alx:5
-- Create an admin user with username 'admin', email 'admin@example.com', and password 'password' (bcrypt encoded)
-- Password 'password' encoded with BCrypt: $2a$10$tC9o426lQ00F2lZf.x.vG.wA.S.g.Q.Z.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q
-- You can generate a new one with https://www.bcryptcalculator.com/
INSERT INTO users (username, email, password)
VALUES ('admin', 'admin@example.com', '$2a$10$tC9o426lQ00F2lZf.x.vG.wA.S.g.Q.Z.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q.Q')
ON CONFLICT (username) DO NOTHING;

-- Assign ROLE_ADMIN to the admin user
DO $$
DECLARE
    admin_user_id BIGINT;
    admin_role_id INTEGER;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ROLE_ADMIN';

    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$;
-- rollback DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE username = 'admin'); DELETE FROM users WHERE username = 'admin';
```

---

### 3. Configuration & Setup

#### `docker-compose.yml`
```yaml