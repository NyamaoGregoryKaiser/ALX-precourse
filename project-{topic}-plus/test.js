The `conftest.py` sets up a dedicated test database and uses transactional fixtures to ensure test isolation and a clean state for each test.

**Performance Testing (Locust):**

A basic Locust test script is provided in `backend/app/tests/performance/test_locust.py`.

1.  **Ensure `docker-compose up` is running.**
2.  **Access the Locust UI:** `http://localhost:8089` (Locust is not part of the `docker-compose.yml` by default to keep it lightweight. You'd typically run it separately or add it as a service temporarily).
3.  **To run Locust locally against the running Docker stack:**