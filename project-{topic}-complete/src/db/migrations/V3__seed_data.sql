```sql
-- No seed data for users (they register).
-- Adding a sample task for an assumed user (id=1) for demonstration purposes.
-- This would typically be for testing or initial setup, not production deployment
-- where users create their own data.
-- In a real scenario, you'd insert actual data using application logic,
-- or use a dedicated seeding script.
-- For demo, assuming a user with ID 1 exists.
-- You would manually register a user first, then retrieve their ID for tasks.

-- INSERT INTO tasks (user_id, title, description, status, due_date)
-- VALUES (1, 'Initial Setup', 'Complete the API setup and deploy', 'IN_PROGRESS', '2023-12-31 23:59:59');
```