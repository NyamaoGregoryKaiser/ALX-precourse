```sql
-- Seed data for users
-- Passwords are 'password123'
INSERT OR IGNORE INTO users (id, username, email, password_hash, created_at) VALUES
(1, 'testuser', 'test@example.com', '$2a$12$6K0/x3.6x.K6K3K1o0.K6.K6K1o0.K6K3K1o0.K6K3K1o0.K6K3K1o0.K6K3K1o0.K6K3K1o0', '2023-10-26 10:00:00'),
(2, 'adminuser', 'admin@example.com', '$2a$12$6K0/x3.6x.K6K3K1o0.K6.K6K1o0.K6K3K1o0.K6K3K1o0.K6K3K1o0.K6K3K1o0.K6K3K1o0', '2023-10-26 10:01:00');

-- Seed data for categories (belonging to user 1)
INSERT OR IGNORE INTO categories (id, name, user_id, created_at) VALUES
(1, 'Work', 1, '2023-10-26 10:05:00'),
(2, 'Personal', 1, '2023-10-26 10:06:00'),
(3, 'Study', 1, '2023-10-26 10:07:00');

-- Seed data for tasks (belonging to user 1)
INSERT OR IGNORE INTO tasks (id, title, description, status, user_id, category_id, due_date, created_at, updated_at) VALUES
(1, 'Finish project proposal', 'Write the full proposal for the Q4 project.', 'IN_PROGRESS', 1, 1, '2023-11-15', '2023-10-26 10:10:00', '2023-10-26 10:10:00'),
(2, 'Buy groceries', 'Milk, eggs, bread, vegetables.', 'TODO', 1, 2, '2023-10-28', '2023-10-26 10:12:00', '2023-10-26 10:12:00'),
(3, 'Prepare for ALX exam', 'Review all precourse materials on C++ and algorithms.', 'TODO', 1, 3, '2023-11-01', '2023-10-26 10:15:00', '2023-10-26 10:15:00'),
(4, 'Call mom', 'Check in and chat.', 'DONE', 1, 2, '2023-10-25', '2023-10-25 09:00:00', '2023-10-25 18:00:00');

-- Seed data for tasks (belonging to user 2, without categories for simplicity)
INSERT OR IGNORE INTO tasks (id, title, description, status, user_id, category_id, due_date, created_at, updated_at) VALUES
(5, 'Review team reports', 'Go through monthly performance reports.', 'TODO', 2, NULL, '2023-10-31', '2023-10-26 10:20:00', '2023-10-26 10:20:00');
```