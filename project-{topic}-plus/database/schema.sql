CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER DEFAULT 0, -- 0 for false, 1 for true
    due_date TEXT
);

INSERT INTO tasks (title, description, due_date) VALUES
('Grocery Shopping', 'Buy milk, eggs, bread', '2024-03-15'),
('Pay Bills', 'Pay electricity and internet bills', '2024-03-10');