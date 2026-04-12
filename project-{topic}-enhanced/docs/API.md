# API Documentation

This document outlines the RESTful API endpoints for the Web Scraping Tools System. All endpoints respond with JSON data.

## Base URL

`http://localhost:8080/api` (when running locally)

## Authentication

All protected routes require a JSON Web Token (JWT) passed in the `Authorization` header as a Bearer token.

`Authorization: Bearer <YOUR_JWT_TOKEN>`

### Error Responses

Standard HTTP status codes are used. Error responses typically have the format:
```json
{
  "error": "Descriptive error message."
}
```

## 1. Authentication Endpoints

### `POST /api/auth/register`

Register a new user account.

*   **Request Body:**
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "securepassword123"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "User registered successfully.",
      "user": {
        "id": 1,
        "username": "newuser",
        "email": "newuser@example.com"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid JSON or missing `username`, `email`, or `password`.
    *   `409 Conflict`: Username or email already exists.

### `POST /api/auth/login`

Authenticate a user and receive a JWT token.

*   **Request Body:**
    ```json
    {
      "username": "admin",
      "password": "adminpass"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Login successful.",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ3ZWJzY3JhcGVyLWFwaSIsInN1YiI6ImFkbWluIiwiaWQiOiIxIiwiaWF0IjoxNjE2MTYxNjE2LCJleHAiOjE2MTYxNzYwMTYsInBheWxvYWQiOnsidXNlcl9pZCI6IjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn19.signature"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid JSON or missing `username` or `password`.
    *   `401 Unauthorized`: Invalid credentials.

---

## 2. Scrape Job Endpoints

These endpoints are protected and require a valid JWT token.

### `POST /api/jobs`

Create a new web scraping job.
Users can only create jobs for themselves. Admins can theoretically create for others by specifying `user_id` but this API is scoped to authenticated user.

*   **Request Body:**
    ```json
    {
      "name": "Product Details Scraper",
      "target_url": "https://example.com/products",
      "selectors": [
        { "key": "product_title", "selector": "h1.product-title" },
        { "key": "price", "selector": "span.price" },
        { "key": "description", "selector": "div#product-description" }
      ],
      "cron_schedule": "0 */6 * * *"  // Optional: CRON expression (e.g., every 6 hours), "manual" if not scheduled
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "id": 1,
      "user_id": 101,
      "name": "Product Details Scraper",
      "target_url": "https://example.com/products",
      "selectors": [
        { "key": "product_title", "selector": "h1.product-title" },
        { "key": "price", "selector": "span.price" },
        { "key": "description", "selector": "div#product-description" }
      ],
      "cron_schedule": "0 */6 * * *",
      "status": "PENDING",
      "created_at": "2023-10-27 10:00:00",
      "updated_at": "2023-10-27 10:00:00",
      "last_run_at": null,
      "next_run_at": null
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid JSON or missing required fields (`name`, `target_url`, `selectors`).
    *   `401 Unauthorized`: No valid token provided.
    *   `403 Forbidden`: User lacks permission to create jobs (e.g., only admins or specific roles).
    *   `500 Internal Server Error`: Failed to store job in the database.

### `GET /api/jobs`

Retrieve all scrape jobs owned by the authenticated user.

*   **Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "user_id": 101,
        "name": "Product Details Scraper",
        "target_url": "https://example.com/products",
        "selectors": [...],
        "cron_schedule": "0 */6 * * *",
        "status": "COMPLETED",
        "created_at": "2023-10-27 10:00:00",
        "updated_at": "2023-10-27 12:30:00",
        "last_run_at": "2023-10-27 12:00:00",
        "next_run_at": "2023-10-27 18:00:00"
      },
      {
        "id": 2,
        "user_id": 101,
        "name": "Another Scraper",
        "target_url": "https://another.com",
        "selectors": [...],
        "cron_schedule": "manual",
        "status": "PENDING",
        "created_at": "2023-10-27 11:00:00",
        "updated_at": "2023-10-27 11:00:00",
        "last_run_at": null,
        "next_run_at": null
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No valid token provided.

### `GET /api/jobs/<id>`

Retrieve a specific scrape job by its ID. Only accessible if the job is owned by the authenticated user or if the user is an admin.

*   **Parameters:**
    *   `id` (integer): The ID of the scrape job.
*   **Response (200 OK):**
    (Same structure as single job in `POST /api/jobs` response)
*   **Error Responses:**
    *   `401 Unauthorized`: No valid token provided.
    *   `404 Not Found`: Job with the given ID not found, or not owned by the user.

### `PUT /api/jobs/<id>`

Update an existing scrape job. Only accessible if the job is owned by the authenticated user or if the user is an admin.

*   **Parameters:**
    *   `id` (integer): The ID of the scrape job to update.
*   **Request Body:**
    (Same structure as `POST /api/jobs` request body. Provide only fields to update.)
    ```json
    {
      "name": "Updated Product Details Scraper",
      "cron_schedule": "0 * * * *", // Change to hourly
      "status": "PENDING" // Can update status, e.g. from FAILED to PENDING
    }
    ```
*   **Response (200 OK):**
    (Same structure as single job in `POST /api/jobs` response, with updated fields.)
*   **Error Responses:**
    *   `400 Bad Request`: Invalid JSON or invalid `status` value.
    *   `401 Unauthorized`: No valid token provided.
    *   `403 Forbidden`: User lacks permission to update this job.
    *   `404 Not Found`: Job with the given ID not found, or not owned by the user.
    *   `500 Internal Server Error`: Failed to update job in the database.

### `DELETE /api/jobs/<id>`

Delete a scrape job. Only accessible if the job is owned by the authenticated user or if the user is an admin.

*   **Parameters:**
    *   `id` (integer): The ID of the scrape job to delete.
*   **Response (204 No Content):**
    (Successful deletion returns an empty response with 204 status.)
*   **Error Responses:**
    *   `401 Unauthorized`: No valid token provided.
    *   `403 Forbidden`: User lacks permission to delete this job.
    *   `404 Not Found`: Job with the given ID not found, or not owned by the user.
    *   `500 Internal Server Error`: Failed to delete job from the database.

### `POST /api/jobs/<id>/scrape`

Manually trigger a scrape job. The scraping process runs asynchronously in the background.

*   **Parameters:**
    *   `id` (integer): The ID of the scrape job to trigger.
*   **Request Body:** (None)
*   **Response (202 Accepted):**
    ```json
    {
      "message": "Scrape job triggered successfully. Check job status for results.",
      "job_id": 1
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No valid token provided.
    *   `403 Forbidden`: User lacks permission to trigger this job.
    *   `404 Not Found`: Job with the given ID not found, or not owned by the user.
    *   `500 Internal Server Error`: Failed to trigger the scrape process.

---

## 3. Scraped Item Endpoints

These endpoints are protected and require a valid JWT token.

### `GET /api/items/<job_id>`

Retrieve all scraped items associated with a specific scrape job. Only accessible if the job is owned by the authenticated user or if the user is an admin.

*   **Parameters:**
    *   `job_id` (integer): The ID of the scrape job whose items to retrieve.
*   **Response (200 OK):**
    ```json
    [
      {
        "id": 101,
        "job_id": 1,
        "url": "https://example.com/products/item1",
        "data": {
          "product_title": "Example Product A",
          "price": "$29.99"
        },
        "scraped_at": "2023-10-27 10:05:00"
      },
      {
        "id": 102,
        "job_id": 1,
        "url": "https://example.com/products/item2",
        "data": {
          "product_title": "Example Product B",
          "price": "$39.99"
        },
        "scraped_at": "2023-10-27 10:06:00"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: No valid token provided.
    *   `404 Not Found`: Scrape job with the given ID not found, or not owned by the user.

---

## Example Workflow

1.  **Register (if new user):**
    `POST /api/auth/register` with `{ "username": "myuser", "email": "myuser@mail.com", "password": "mypass" }`
2.  **Login:**
    `POST /api/auth/login` with `{ "username": "myuser", "password": "mypass" }`
    (Receive JWT token)
3.  **Create a job:**
    `POST /api/jobs` with `Authorization: Bearer <token>` and job details.
4.  **Trigger a scrape:**
    `POST /api/jobs/<job_id>/scrape` with `Authorization: Bearer <token>`
5.  **Get job status (check completion):**
    `GET /api/jobs/<job_id>` with `Authorization: Bearer <token>`
6.  **Retrieve scraped data:**
    `GET /api/items/<job_id>` with `Authorization: Bearer <token>`