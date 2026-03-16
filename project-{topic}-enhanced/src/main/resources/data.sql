```sql
-- Note: Passwords must be encoded if inserted directly.
-- For local testing or initial setup with Spring Boot (without Flyway handling data.sql),
-- you'd typically have a `User user = new User(...)` in an `@PostConstruct` method
-- or a Flyway data script with `INSERT` statements using encoded passwords.

-- This data.sql is primarily for H2 in tests or if Flyway is configured to pick it up.
-- For production, use Flyway data scripts (V*__load_data.sql) or migration callbacks.

-- Example for a user (password is 'password' encoded with BCrypt)
-- INSERT INTO users (username, email, password, role) VALUES
-- ('testuser', 'test@example.com', '$2a$10$oXk8m9k6L8N6M7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4', 'ROLE_USER');
-- ('adminuser', 'admin@example.com', '$2a$10$oXk8m9k6L8N6M7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4', 'ROLE_ADMIN');

```