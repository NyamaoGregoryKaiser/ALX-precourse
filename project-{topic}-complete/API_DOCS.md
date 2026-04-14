```markdown
# Web Scraping Tools System - API Documentation

This document outlines the RESTful API endpoints for the Web Scraping Tools System.

## Base URL

`http://localhost:8000/api` (or your deployed backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header.

**Header Format:** `Authorization: Bearer <your_access_token>`

Access tokens are obtained via the `/api/auth/login` or `/api/auth/register` endpoints.

## Error Handling

API responses for errors will follow a consistent JSON structure:

```json
{
  "code": 404,
  "message": "Not found",
  "stack": "..." // Only in development environment
}
```

## 1. Authentication Endpoints

### `POST /auth/register`

Register a new user account.

*   **Rate Limited**: Yes (10 requests per 15 minutes)
*   **Required Role**: None
*   **Request Body**:
    ```json
    {
      "username": "string",
      "email": "string (email format)",
      "password": "string (min 8 characters)"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "statusCode": 201,
      "data": {
        "user": {
          "id": 1,
          "username": "newuser",
          "email": "newuser@example.com",
          "role": "user"
        },
        "token": "jwt_access_token"
      },
      "message": "User registered successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input (e.g., missing fields, invalid email).
    *   `409 Conflict`: Email already taken.
    *   `429 Too Many Requests`: Rate limit exceeded.

### `POST /auth/login`

Authenticate a user and receive an access token.

*   **Rate Limited**: Yes (10 requests per 15 minutes)
*   **Required Role**: None
*   **Request Body**:
    ```json
    {
      "email": "string (email format)",
      "password": "string"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": {
        "user": {
          "id": 1,
          "username": "existinguser",
          "email": "existinguser@example.com",
          "role": "user"
        },
        "token": "jwt_access_token"
      },
      "message": "Logged in successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing fields.
    *   `401 Unauthorized`: Incorrect email or password.
    *   `429 Too Many Requests`: Rate limit exceeded.

---

## 2. User Endpoints

### `GET /users`

Retrieve a list of all users.

*   **Authentication**: Required
*   **Required Role**: `admin`
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": [
        {
          "id": 1,
          "username": "admin",
          "email": "admin@example.com",
          "role": "admin",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        },
        {
          "id": 2,
          "username": "testuser",
          "email": "user@example.com",
          "role": "user",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        }
      ],
      "message": "Users retrieved successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `admin` role.

### `GET /users/:userId`

Retrieve details of a specific user.

*   **Authentication**: Required
*   **Required Role**: `admin` can access any user; `user` can only access their own ID.
*   **Path Parameters**:
    *   `userId` (integer): The ID of the user.
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": {
        "id": 2,
        "username": "testuser",
        "email": "user@example.com",
        "role": "user",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      },
      "message": "User retrieved successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to access another user's profile without `admin` role.
    *   `404 Not Found`: User with `userId` not found.

### `PATCH /users/:userId`

Update details of a specific user.

*   **Authentication**: Required
*   **Required Role**: `admin` can update any user; `user` can only update their own profile (cannot change `role`).
*   **Path Parameters**:
    *   `userId` (integer): The ID of the user.
*   **Request Body**:
    ```json
    {
      "username": "string (optional)",
      "email": "string (email format, optional)",
      "password": "string (min 8 characters, optional)",
      "role": "enum('user', 'admin', optional, admin only)"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": { /* Updated user object */ },
      "message": "User updated successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to update another user or change role without `admin` permission.
    *   `404 Not Found`: User with `userId` not found.
    *   `409 Conflict`: Email already taken by another user.

### `DELETE /users/:userId`

Delete a specific user.

*   **Authentication**: Required
*   **Required Role**: `admin` (cannot delete their own account via this endpoint).
*   **Path Parameters**:
    *   `userId` (integer): The ID of the user.
*   **Success Response (204 No Content)**:
    *   No response body.
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have `admin` role, or admin attempts to delete self.
    *   `404 Not Found`: User with `userId` not found.

---

## 3. Scraping Job Endpoints

### `POST /jobs`

Create a new scraping job.

*   **Authentication**: Required
*   **Required Role**: `user` or `admin`
*   **Request Body**:
    ```json
    {
      "name": "string (required)",
      "start_url": "string (URL format, required)",
      "selectors": {
        "itemSelector": "string (CSS selector for individual items, optional)",
        "field1": "string (CSS selector for field1, e.g., 'h1.title', required)",
        "field2": "string (CSS selector for field2, e.g., '.description p', or '.image[src]', required)",
        "...": "..."
      },
      "scrape_type": "enum('static', 'dynamic', required)",
      "schedule_cron": "string (cron expression, optional, e.g., '0 * * * *' for hourly)",
      "is_active": "boolean (optional, default: true)"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "statusCode": 201,
      "data": {
        "id": 101,
        "user_id": 2,
        "name": "My Product Scraper",
        "start_url": "https://example.com/products",
        "selectors": { "itemSelector": ".product", "title": "h2", "price": ".price" },
        "scrape_type": "dynamic",
        "schedule_cron": "0 0 * * *",
        "is_active": true,
        "status": "pending",
        "created_at": "timestamp"
      },
      "message": "Scraping job created successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Missing required fields, invalid URL, or invalid JSON for selectors.
    *   `401 Unauthorized`: Invalid or missing token.

### `GET /jobs`

Retrieve a list of scraping jobs.

*   **Authentication**: Required
*   **Required Role**: `admin` can see all jobs; `user` can only see their own jobs.
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": [
        {
          "id": 101,
          "user_id": 2,
          "name": "My Product Scraper",
          "start_url": "https://example.com/products",
          "selectors": { "itemSelector": ".product", "title": "h2", "price": ".price" },
          "scrape_type": "dynamic",
          "schedule_cron": "0 0 * * *",
          "is_active": true,
          "status": "pending",
          "last_run": null,
          "next_run": "timestamp",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        }
      ],
      "message": "Scraping jobs retrieved successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.

### `GET /jobs/:jobId`

Retrieve details of a specific scraping job.

*   **Authentication**: Required
*   **Required Role**: `admin` can access any job; `user` can only access their own jobs.
*   **Path Parameters**:
    *   `jobId` (integer): The ID of the scraping job.
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": { /* Single job object, same structure as in GET /jobs array */ },
      "message": "Scraping job retrieved successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to access another user's job.
    *   `404 Not Found`: Job with `jobId` not found.

### `PATCH /jobs/:jobId`

Update details of a specific scraping job.

*   **Authentication**: Required
*   **Required Role**: `admin` can update any job; `user` can only update their own jobs.
*   **Path Parameters**:
    *   `jobId` (integer): The ID of the scraping job.
*   **Request Body**:
    ```json
    {
      "name": "string (optional)",
      "start_url": "string (URL format, optional)",
      "selectors": { /* JSON object of selectors, optional */ },
      "scrape_type": "enum('static', 'dynamic', optional)",
      "schedule_cron": "string (cron expression, optional)",
      "is_active": "boolean (optional)",
      "status": "enum('pending', 'running', 'completed', 'failed', 'scheduled', optional, admin only)"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": { /* Updated job object */ },
      "message": "Scraping job updated successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to update another user's job.
    *   `404 Not Found`: Job with `jobId` not found.

### `DELETE /jobs/:jobId`

Delete a specific scraping job and all its associated data and logs.

*   **Authentication**: Required
*   **Required Role**: `admin` can delete any job; `user` can only delete their own jobs.
*   **Path Parameters**:
    *   `jobId` (integer): The ID of the scraping job.
*   **Success Response (204 No Content)**:
    *   No response body.
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to delete another user's job.
    *   `404 Not Found`: Job with `jobId` not found.

### `POST /jobs/:jobId/run`

Manually trigger a scraping job to run immediately.

*   **Authentication**: Required
*   **Required Role**: `admin` can run any job; `user` can only run their own jobs.
*   **Path Parameters**:
    *   `jobId` (integer): The ID of the scraping job.
*   **Success Response (202 Accepted)**:
    ```json
    {
      "statusCode": 202,
      "data": null,
      "message": "Scraping job enqueued for immediate execution",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to run another user's job.
    *   `404 Not Found`: Job with `jobId` not found.

---

## 4. Scraped Data & Logs Endpoints

### `GET /data/jobs/:jobId/data`

Retrieve all scraped data for a specific job.

*   **Authentication**: Required
*   **Required Role**: `admin` can access any job's data; `user` can only access their own job's data.
*   **Path Parameters**:
    *   `jobId` (integer): The ID of the scraping job.
*   **Query Parameters**:
    *   `limit` (integer, optional, default: 100): Maximum number of data items to return.
    *   `offset` (integer, optional, default: 0): Number of data items to skip.
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": {
        "data": [
          {
            "id": 201,
            "job_id": 101,
            "url": "https://example.com/products/item1",
            "data": { "title": "Product A", "price": "$29.99" },
            "scraped_at": "timestamp"
          },
          {
            "id": 202,
            "job_id": 101,
            "url": "https://example.com/products/item2",
            "data": { "title": "Product B", "price": "$19.99" },
            "scraped_at": "timestamp"
          }
        ],
        "total": 2
      },
      "message": "Scraped data retrieved successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to access another user's job data.
    *   `404 Not Found`: Job with `jobId` not found.

### `GET /data/jobs/:jobId/logs`

Retrieve logs for a specific scraping job.

*   **Authentication**: Required
*   **Required Role**: `admin` can access any job's logs; `user` can only access their own job's logs.
*   **Path Parameters**:
    *   `jobId` (integer): The ID of the scraping job.
*   **Success Response (200 OK)**:
    ```json
    {
      "statusCode": 200,
      "data": [
        {
          "id": 301,
          "job_id": 101,
          "level": "info",
          "message": "Job started successfully.",
          "timestamp": "timestamp"
        },
        {
          "id": 302,
          "job_id": 101,
          "level": "error",
          "message": "Scraping failed: Element not found.",
          "timestamp": "timestamp"
        }
      ],
      "message": "Job logs retrieved successfully",
      "success": true
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User tries to access another user's job logs.
    *   `404 Not Found`: Job with `jobId` not found.
```