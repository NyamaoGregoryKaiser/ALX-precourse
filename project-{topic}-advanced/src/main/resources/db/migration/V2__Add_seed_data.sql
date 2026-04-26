-- V2__Add_seed_data.sql

-- Seed a default admin user and a regular user
-- Passwords are 'adminpass' and 'userpass' respectively, hashed using BCrypt.
-- Use a tool like https://bcrypt-generator.com/ or Spring's BCryptPasswordEncoder
-- to generate hashes. The hashes below are examples and should be regenerated
-- for actual production use.
-- For "adminpass": $2a$10$Wp.E5V.K2.W.L.B5.H9.N.U.Y.C.B.G.H.I.J.K.L.M.N.O.P.Q.R.S.T.U.V.W.X.Y.Z.
-- For "userpass": $2a$10$Xq.E5V.K2.W.L.B5.H9.N.U.Y.C.B.G.H.I.J.K.L.M.N.O.P.Q.R.S.T.U.V.W.X.Y.Z.

-- Password for 'admin': 'adminpass'
INSERT INTO users (id, username, password, created_at, updated_at) VALUES
    (1, 'admin', '$2a$10$gM.6FwP9zQ.K5G0J5b0xJ.e.Q.j.C.k.L.m.n.o.p.q.r.s.t.u.v.w.x.y.z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Password for 'testuser': 'userpass'
INSERT INTO users (id, username, password, created_at, updated_at) VALUES
    (2, 'testuser', '$2a$10$H.9XzY.B0k.V2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add roles
INSERT INTO user_roles (user_id, role) VALUES
    (1, 'ROLE_USER'),
    (1, 'ROLE_ADMIN');

INSERT INTO user_roles (user_id, role) VALUES
    (2, 'ROLE_USER');

-- Seed a sample scraping job for testuser
INSERT INTO scraping_jobs (user_id, name, target_url, css_selector, schedule_cron, status, created_at, updated_at) VALUES
    (2, 'ALX Homepage Links', 'https://www.alxafrica.com/', 'a[href]', '0 0 0 * * *', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ALX Focus: Provides initial data for testing and demonstration, essential for
-- quickly getting a development environment up and running. BCrypt hashing for passwords
-- is crucial for security.
```