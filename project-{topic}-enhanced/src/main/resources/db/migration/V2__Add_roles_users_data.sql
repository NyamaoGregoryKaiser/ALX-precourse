-- Insert default roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_MODERATOR') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert a default admin user (password 'adminpass')
-- IMPORTANT: In production, do not hardcode passwords. This is for initial setup.
INSERT INTO users (username, email, password)
VALUES ('admin', 'admin@example.com', '$2a$10$wS2FpXl6n5h/rBf7OQ.jGu2B.sV.2.sV.2.sV.2.sV.2.sV.2.sV.2.sV.2.sV.2') -- password is 'adminpass'
ON CONFLICT (username) DO NOTHING;

-- Assign admin role to the admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert a default moderator user (password 'modpass')
INSERT INTO users (username, email, password)
VALUES ('moderator', 'mod@example.com', '$2a$10$n4.4Xn.iT.qN1Mv.eR.mQ.z.z.z.z.z.z.z.z.z.z.z.z.z.z.z') -- password is 'modpass'
ON CONFLICT (username) DO NOTHING;

-- Assign moderator role to the moderator user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'moderator' AND r.name = 'ROLE_MODERATOR'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert a default normal user (password 'userpass')
INSERT INTO users (username, email, password)
VALUES ('user', 'user@example.com', '$2a$10$s.a.Q.a.S.x.F.y.G.h.I.j.K.l.M.n.O.p.Q.r.S.t.U.v.W.x.Y.z') -- password is 'userpass'
ON CONFLICT (username) DO NOTHING;

-- Assign user role to the normal user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'user' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;