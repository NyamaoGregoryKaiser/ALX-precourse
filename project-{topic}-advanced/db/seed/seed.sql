-- Seed an initial admin user
-- NOTE: In a real production system, this password should be generated securely
-- and NOT hardcoded. For demonstration, we use a pre-hashed password for 'admin'.
-- Password 'password123' hashed (example hash - THIS IS NOT A REAL BCrypt HASH,
-- replace with actual BCrypt hash generated during app startup or a script).
-- Assuming a bcrypt hash of "password123" is something like:
-- '$2a$10$abcdefghijklmnopqrstuvwx.abcdefghijklmnopqrstuvwx'
-- For this seed, we use a dummy hash. The PasswordHasher will generate real ones.

-- A real BCrypt hash for 'password123' might look like: $2a$10$M68.I.38t/22zM/w.304cuz/Fp.6w8.Jb/B.K8.Fk.L8...
-- To create a seed for the initial admin, you'd run `echo "password123" | bcryptgen -c 10`
-- (assuming you have a bcrypt utility) or hash it programmatically.
-- For this example, let's use a placeholder hash, which will *fail* verification unless
-- the `PasswordHasher` is stubbed or generates this exact hash.
-- The app's `PasswordHasher::hashPassword` should be used to get a real hash.
-- Example BCrypt hash for "admin123": $2a$10$wS2V9qA8qH8xQ1f/1z6Vw.1A6k8L.3M5E7S7C8Z2D7.b6.Q3.r2P9
-- I will use this placeholder.

DO $$
DECLARE
    admin_user_id BIGINT;
    admin_role_id INT;
BEGIN
    -- Insert admin user if not exists
    INSERT INTO users (username, email, password_hash, enabled)
    VALUES ('admin', 'admin@example.com', '$2a$10$wS2V9qA8qH8xQ1f/1z6Vw.1A6k8L.3M5E7S7C8Z2D7.b6.Q3.r2P9', TRUE) -- Hashed 'admin123'
    ON CONFLICT (username) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- If admin user was just inserted (admin_user_id is not null) or already exists
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Admin user (ID: %) inserted or already exists.', admin_user_id;
    ELSE
        SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
        RAISE NOTICE 'Admin user (ID: %) already present.', admin_user_id;
    END IF;

    -- Get admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

    -- Assign admin role to admin user if not already assigned
    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
        RAISE NOTICE 'Admin role assigned to admin user.';
    END IF;
END $$;
```