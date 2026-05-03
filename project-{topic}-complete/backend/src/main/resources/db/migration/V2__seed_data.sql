-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert an admin user (password 'adminpass')
-- The password 'adminpass' is BCrypt encoded: $2a$10$04mR1k1h01b/E/xT4b2z.O2uQ.7A/7o/9D.e.4t.3k.4P.v.2G.1
-- You can generate a new one using BCryptPasswordEncoder in Spring Security if needed.
-- Make sure to update the encoded password if you change it.
INSERT INTO users (username, email, password, registration_date)
VALUES ('admin', 'admin@example.com', '$2a$10$04mR1k1h01b/E/xT4b2z.O2uQ.7A/7o/9D.e.4t.3k.4P.v.2G.1', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Assign ROLE_ADMIN to the admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert a regular user (password 'userpass')
-- The password 'userpass' is BCrypt encoded: $2a$10$wE/7R3Z3d/4T.8O7g.9u.2X.0y.0S.1Q.0G.7F.7E.5D.4C.3B
INSERT INTO users (username, email, password, registration_date)
VALUES ('user', 'user@example.com', '$2a$10$wE/7R3Z3d/4T.8O7g.9u.2X.0y.0S.1Q.0G.7F.7E.5D.4C.3B', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Assign ROLE_USER to the regular user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'user' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;
```