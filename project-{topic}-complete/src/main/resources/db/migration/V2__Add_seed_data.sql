```sql
-- Insert Categories
INSERT INTO categories (name) VALUES ('Electronics') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Books') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Apparel') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('Home Goods') ON CONFLICT (name) DO NOTHING;

-- Insert Products (assuming categories are created and IDs are known/autoincremented)
-- NOTE: In a real scenario, you'd retrieve category IDs dynamically or use specific IDs
-- For simplicity, assuming IDs start from 1 and are sequential based on insertion order for seed data.
-- You might need to adjust category_id values if your actual database assigns different IDs.

INSERT INTO products (name, description, price, category_id) VALUES
('Laptop Pro X', 'Powerful laptop for professionals', 1200.00, (SELECT id FROM categories WHERE name = 'Electronics'))
ON CONFLICT DO NOTHING;
INSERT INTO products (name, description, price, category_id) VALUES
('Smartphone Ultra', 'Latest generation smartphone with advanced features', 800.00, (SELECT id FROM categories WHERE name = 'Electronics'))
ON CONFLICT DO NOTHING;
INSERT INTO products (name, description, price, category_id) VALUES
('The Great Adventure', 'A thrilling fantasy novel', 25.50, (SELECT id FROM categories WHERE name = 'Books'))
ON CONFLICT DO NOTHING;
INSERT INTO products (name, description, price, category_id) VALUES
('Classic T-Shirt', 'Comfortable cotton t-shirt', 15.00, (SELECT id FROM categories WHERE name = 'Apparel'))
ON CONFLICT DO NOTHING;
INSERT INTO products (name, description, price, category_id) VALUES
('Smart Coffee Maker', 'Brew perfect coffee with smart controls', 150.00, (SELECT id FROM categories WHERE name = 'Home Goods'))
ON CONFLICT DO NOTHING;

-- Insert Users
-- Passwords are 'password' for both, hashed using BCrypt
-- Generated using new BCryptPasswordEncoder().encode("password")
INSERT INTO users (username, password, role) VALUES ('admin', '$2a$10$wTf2tHjLz.e.u.x0jS0jA.Z.s.D.l.C.d.S.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v', 'ROLE_ADMIN') ON CONFLICT (username) DO NOTHING;
INSERT INTO users (username, password, role) VALUES ('user', '$2a$10$wTf2tHjLz.e.u.x0jS0jA.Z.s.D.l.C.d.S.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v', 'ROLE_USER') ON CONFLICT (username) DO NOTHING;
```