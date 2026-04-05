# Database Layer Documentation

This directory contains all assets related to the PostgreSQL database for the Task Management System.

## Contents

*   `schema/`: Contains the initial `001_initial_schema.sql` script that creates all tables, enums, indexes, and foreign key constraints.
*   `migrations/`: This directory is structured to hold incremental database migration scripts (`up/` for applying, `down/` for reverting). For this project, `001_initial_schema.sql` serves as the initial "up" migration. Subsequent changes would add new files here.
*   `seed/`: Contains `seed_data.sql` which populates the database with sample data for development and testing.

## Database Schema

The database consists of the following tables:

*   **`users`**: Stores user information (ID, username, email, hashed password, role, timestamps).
*   **`projects`**: Stores project details (ID, owner, name, description, timestamps). Each project belongs to a `user`.
*   **`tasks`**: Stores task details (ID, project, title, description, status, priority, due date, assigned user, timestamps). Each task belongs to a `project` and can be assigned to a `user`.
    *   `task_priority` ENUM: `Low`, `Medium`, `High`, `Urgent`.
    *   `task_status` ENUM: `Open`, `InProgress`, `Blocked`, `Review`, `Done`, `Archived`.
*   **`tags`**: Stores unique tags (ID, name, timestamps) for categorizing tasks.
*   **`task_tags`**: A junction table linking `tasks` to `tags` (many-to-many relationship).

### Relationships

*   `users` 1:N `projects` (one user can own many projects)
*   `users` 1:N `tasks` (one user can be assigned to many tasks)
*   `projects` 1:N `tasks` (one project can have many tasks)
*   `tasks` N:M `tags` (many tasks can have many tags, and vice-versa, resolved by `task_tags` table)

## Setup and Initialization

To set up the database:

1.  **Ensure PostgreSQL is running.**
2.  **Create a dedicated user and database:**
    ```sql
    CREATE USER task_manager_user WITH PASSWORD 'your_secure_password';
    CREATE DATABASE task_manager_db OWNER task_manager_user;
    -- Grant necessary privileges if the user is not the owner or if schema is not public.
    -- Example: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO task_manager_user;
    --          GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO task_manager_user;
    ```
3.  **Apply the initial schema:**
    ```bash
    psql -U task_manager_user -d task_manager_db -h localhost -p 5432 -f database/schema/001_initial_schema.sql
    ```
4.  **Load seed data (optional, for development/testing):**
    ```bash
    psql -U task_manager_user -d task_manager_db -h localhost -p 5432 -f database/seed/seed_data.sql
    ```

## Migrations

For this project, `001_initial_schema.sql` serves as the baseline. In a real-world scenario, any subsequent changes to the database schema would be managed by creating new migration scripts in the `migrations/up` and `migrations/down` directories.

*   `up/`: Scripts to apply schema changes (e.g., add column, create new table).
*   `down/`: Scripts to revert schema changes (undo what the corresponding `up` script did).

**Example Migration Workflow (manual):**

1.  Create `migrations/up/002_add_due_date_index.sql`:
    ```sql
    CREATE INDEX idx_tasks_due_date ON tasks (due_date);
    ```
2.  Create `migrations/down/002_add_due_date_index.sql`:
    ```sql
    DROP INDEX IF EXISTS idx_tasks_due_date;
    ```
3.  Apply the migration:
    ```bash
    psql -U task_manager_user -d task_manager_db -h localhost -p 5432 -f database/migrations/up/002_add_due_date_index.sql
    ```

For automated deployments (e.g., via Docker Compose), the `docker/init-db.sh` script handles applying all necessary migrations and seed data.

## Query Optimization

*   **Indexes**: Already defined on frequently queried columns (`users.username`, `users.email`, `projects.owner_id`, `tasks.project_id`, `tasks.assigned_to`, `tasks.status`, `tasks.due_date`, `tags.name`).
*   **Foreign Keys**: Enforce referential integrity and can aid query planners.
*   **Data Types**: Appropriate data types are used (e.g., `VARCHAR` for strings, `TEXT` for longer descriptions, `TIMESTAMP WITHOUT TIME ZONE` for dates).
*   **Drogon ORM**: Generates parameterized queries, preventing SQL injection and often leading to optimized execution plans.
*   **EXPLAIN ANALYZE**: For identifying slow queries in development, use `EXPLAIN ANALYZE` in `psql` to inspect query execution plans.