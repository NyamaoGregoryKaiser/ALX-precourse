Remember to adjust `REACT_APP_API_URL` in `frontend/.env` to `https://yourdomain.com/v1` if using this setup.

## 8. CI/CD

The project includes a basic CI/CD pipeline configuration using GitHub Actions (`.github/workflows/ci.yml`).

**Workflow Steps:**

1.  **`backend-test` Job:**
    *   Checks out code.
    *   Sets up Node.js (v18).
    *   Installs backend dependencies.
    *   Sets up a temporary PostgreSQL database using `setup-postgres` action.
    *   Sets up a temporary Redis instance using `actions-setup-redis`.
    *   Configures backend `.env` file for the test database.
    *   Runs `sequelize-cli db:migrate` and `db:seed:all` to prepare the test database.
    *   Executes `npm test --prefix backend`.
2.  **`frontend-test` Job:**
    *   Checks out code.
    *   Sets up Node.js (v18).
    *   Installs frontend dependencies.
    *   Executes `npm test --prefix frontend`.

This workflow ensures that all code changes are automatically tested upon push or pull request, preventing regressions and maintaining code quality. For full CI/CD, deployment steps to a cloud provider would be added to this workflow.

## 9. Additional Features

*   **Authentication/Authorization:** JWT-based system with access and refresh tokens. `auth` middleware verifies tokens and `roles` for endpoint access.
*   **Logging and Monitoring:** `Winston` is used for structured logging in the backend, configurable for different environments. Logs provide insights into application flow, errors, and debugging.
*   **Error Handling Middleware:** A centralized error handling system (`error.js`) converts various errors into `ApiError` instances, providing consistent JSON error responses with appropriate HTTP statuses.
*   **Caching Layer:** `Redis` is integrated to cache API responses (`cache.js` middleware). This reduces database load and speeds up read-heavy operations for frequently accessed data (e.g., list of scrapers).
*   **Rate Limiting:** `express-rate-limit` is used to protect authentication endpoints (`authLimiter` middleware), preventing brute-force attacks and abuse. Can be extended to other endpoints.
*   **Validation:** `Joi` schemas are used for API request body and query parameter validation, ensuring data integrity before processing.
*   **Database Migrations & Seeding:** `sequelize-cli` simplifies database schema evolution and populating initial data.
*   **Configuration Management:** `dotenv` and `Joi` provide robust environment variable loading and validation.

## 10. ALX Project Focus

This project directly addresses the ALX Software Engineering precourse materials by emphasizing:

*   **Programming Logic:** The scraping engine's logic (handling static vs. dynamic content, parsing with selectors), task management (job status transitions, logging), and authentication flows demonstrate complex logical reasoning.
*   **Algorithm Design:** While not explicitly "algorithms" in the traditional sense (like sorting), the design of the scraping process (fetching, parsing, storing), error recovery, and efficient data handling (e.g., choosing `JSONB` for flexible data) reflect algorithmic thinking in practical application.
*   **Technical Problem Solving:** Tackling challenges like handling dynamic web content with Puppeteer, securing API endpoints, ensuring data consistency with transactions (implicitly via ORM), and building a scalable architecture are core technical problem-solving exercises. The modular design, error handling, and testing strategies are all facets of robust problem-solving.

## 11. Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`npm test --prefix backend && npm test --prefix frontend`).
6.  Commit your changes (`git commit -m 'feat: Add new feature'`).
7.  Push to the branch (`git push origin feature/your-feature`).
8.  Open a Pull Request.

## 12. License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.