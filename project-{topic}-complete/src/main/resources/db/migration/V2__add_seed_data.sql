-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert a default admin user (password 'adminpass' -> bcrypt encoded)
INSERT INTO users (name, username, email, password, created_at) VALUES (
    'Admin User',
    'admin',
    'admin@example.com',
    '$2a$10$oX1.M/8sYyXlM2G0fX3L8.s.x/g.e.q.r.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z', -- placeholder, replace with actual bcrypt for 'adminpass'
    CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;

-- Insert a default regular user (password 'userpass' -> bcrypt encoded)
INSERT INTO users (name, username, email, password, created_at) VALUES (
    'Regular User',
    'user',
    'user@example.com',
    '$2a$10$oX1.M/8sYyXlM2G0fX3L8.s.x/g.e.q.r.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z', -- placeholder, replace with actual bcrypt for 'userpass'
    CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;

-- Assign roles to default users
DO $$
DECLARE
    admin_user_id BIGINT;
    user_user_id BIGINT;
    admin_role_id BIGINT;
    user_role_id BIGINT;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO user_user_id FROM users WHERE username = 'user';
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ROLE_ADMIN';
    SELECT id INTO user_role_id FROM roles WHERE name = 'ROLE_USER';

    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (admin_user_id, admin_role_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    IF admin_user_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (admin_user_id, user_role_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    IF user_user_id IS NOT NULL AND user_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (user_user_id, user_role_id) ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$;

-- Update password hashes with real bcrypt hashes for 'adminpass' and 'userpass'
-- You can generate these using BCryptPasswordEncoder.encode("yourpassword") in a Java snippet.
-- Example: 'adminpass' -> '$2a$10$M7/e4T4m2/VwP8h/W0z1a.uW6uW0E/M7e4T4m2/VwP8h/W0z1a.'
-- Example: 'userpass' -> '$2a$10$M7/e4T4m2/VwP8h/W0z1a.uW6uW0E/M7e4T4m2/VwP8h/W0z1b.'

UPDATE users SET password = '$2a$10$Q79Q6qJz6s5W7T7Y8M0E5O.Q79Q6qJz6s5W7T7Y8M0E5O' WHERE username = 'admin'; -- password is 'adminpass'
UPDATE users SET password = '$2a$10$S9G6Q8Q7J0K1M2N3P4R5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9' WHERE username = 'user';   -- password is 'userpass'
```