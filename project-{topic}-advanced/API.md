```markdown
# PerformancePulse - API Documentation

This document provides detailed information about the RESTful API endpoints exposed by the PerformancePulse backend.

**Base URL:** `http://localhost:5000/api/v1` (or your configured backend URL)

## Authentication

All protected endpoints require a JSON Web Token (JWT) to be passed in the `Authorization` header as a Bearer token: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

### 1. Auth Endpoints

*   **`POST /auth/register`**
    *   **Description:** Register a new user.
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
          "message": "User registered successfully",
          "user": {
            "id": "uuid",
            "username": "newuser",
            "email": "newuser@example.com",
            "role": "user"
          }
        }
        ```
    *   **Error (400 Bad Request):** If username or email already exists, or validation fails.

*   **`POST /auth/login`**
    *   **Description:** Authenticate a user and get a JWT token.
    *   **Request Body:**
        ```json
        {
          "email": "user@example.com",
          "password": "securepassword123"
        }
        ```
    *   **Response (200 OK):**
        ```json
        {
          "message": "Login successful",
          "token": "eyJhbGciOiJIUzI1Ni...",
          "user": {
            "id": "uuid",
            "username": "exampleuser",
            "email": "user@example.com",
            "role": "user"
          }
        }
        ```
    *   **Error (401 Unauthorized):** Invalid credentials.

### 2. User Endpoints (Admin only for some)

*   **`GET /users`**
    *   **Description:** Get a list of all users.
    *   **Authorization:** Admin Role Required.
    *   **Response (200 OK):**
        ```json
        [
          { "id": "uuid", "username": "admin", "email": "admin@example.com", "role": "admin" },
          { "id": "uuid", "username": "john.doe", "email": "john.doe@example.com", "role": "user" }
        ]
        ```

*   **`GET /users/:id`**
    *   **Description:** Get a user by ID.
    *   **Authorization:** Admin Role or Owner.
    *   **Response (200 OK):**
        ```json
        {
          "id": "uuid",
          "username": "john.doe",
          "email": "john.doe@example.com",
          "role": "user"
        }
        ```
    *   **Error (404 Not Found):** User not found.

*   **`PUT /users/:id`**
    *   **Description:** Update a user's details.
    *   **Authorization:** Admin Role or Owner.
    *   **Request Body (example):**
        ```json
        {
          "username": "john.d",
          "password": "newpassword123"
        }
        ```
    *   **Response (200 OK):** Updated user object.

*   **`DELETE /users/:id`**
    *   **Description:** Delete a user.
    *   **Authorization:** Admin Role or Owner.
    *   **Response (204 No Content)**
    *   **Error (404 Not Found):** User not found.

### 3. Project Endpoints

*   **`GET /projects`**
    *   **Description:** Get all projects belonging to the authenticated user.
    *   **Authorization:** Required.
    *   **Response (200 OK):**
        ```json
        [
          { "id": "uuid", "name": "My First Project", "description": "Monitoring critical services." },
          { "id": "uuid", "name": "Dev Environment", "description": "Staging services." }
        ]
        ```

*   **`GET /projects/:id`**
    *   **Description:** Get a specific project by ID.
    *   **Authorization:** Required (user must own the project).
    *   **Response (200 OK):**
        ```json
        {
          "id": "uuid",
          "name": "My First Project",
          "description": "Monitoring critical services.",
          "user": { "id": "uuid", "username": "currentuser" },
          "monitors": [ ... ] // Optionally include associated monitors
        }
        ```
    *   **Error (404 Not Found):** Project not found or not owned by user.

*   **`POST /projects`**
    *   **Description:** Create a new project.
    *   **Authorization:** Required.
    *   **Request Body:**
        ```json
        {
          "name": "New Project Name",
          "description": "Description of the new project."
        }
        ```
    *   **Response (201 Created):** New project object.

*   **`PUT /projects/:id`**
    *   **Description:** Update a project.
    *   **Authorization:** Required (user must own the project).
    *   **Request Body (example):**
        ```json
        {
          "name": "Updated Project Name"
        }
        ```
    *   **Response (200 OK):** Updated project object.

*   **`DELETE /projects/:id`**
    *   **Description:** Delete a project.
    *   **Authorization:** Required (user must own the project).
    *   **Response (204 No Content)**
    *   **Error (404 Not Found):** Project not found or not owned by user.

### 4. Monitor Endpoints

*   **`GET /monitors`**
    *   **Description:** Get all monitors belonging to the authenticated user.
    *   **Authorization:** Required.
    *   **Response (200 OK):**
        ```json
        [
          { "id": "uuid", "name": "Google Homepage", "url": "https://www.google.com", "intervalSeconds": 60, "projectId": "uuid", "status": "active" },
          { "id": "uuid", "name": "My API Endpoint", "url": "https://api.example.com/health", "intervalSeconds": 300, "projectId": "uuid", "status": "paused" }
        ]
        ```

*   **`GET /monitors/:id`**
    *   **Description:** Get a specific monitor by ID.
    *   **Authorization:** Required (user must own the monitor).
    *   **Response (200 OK):**
        ```json
        {
          "id": "uuid",
          "name": "Google Homepage",
          "url": "https://www.google.com",
          "intervalSeconds": 60,
          "method": "GET",
          "status": "active",
          "project": { "id": "uuid", "name": "My First Project" },
          "lastCheckAt": "2023-10-27T10:00:00Z"
        }
        ```
    *   **Error (404 Not Found):** Monitor not found or not owned by user.

*   **`POST /monitors`**
    *   **Description:** Create a new monitor.
    *   **Authorization:** Required.
    *   **Request Body:**
        ```json
        {
          "name": "New Monitor",
          "url": "https://newservice.com/health",
          "intervalSeconds": 120,
          "method": "GET",
          "projectId": "uuid-of-an-existing-project"
        }
        ```
    *   **Response (201 Created):** New monitor object.

*   **`PUT /monitors/:id`**
    *   **Description:** Update a monitor.
    *   **Authorization:** Required (user must own the monitor).
    *   **Request Body (example):**
        ```json
        {
          "intervalSeconds": 30
        }
        ```
    *   **Response (200 OK):** Updated monitor object.

*   **`DELETE /monitors/:id`**
    *   **Description:** Delete a monitor.
    *   **Authorization:** Required (user must own the monitor).
    *   **Response (204 No Content)**
    *   **Error (404 Not Found):** Monitor not found or not owned by user.

### 5. Metric Endpoints

*   **`GET /monitors/:monitorId/metrics`**
    *   **Description:** Get metrics for a specific monitor.
    *   **Authorization:** Required (user must own the monitor).
    *   **Query Parameters:**
        *   `limit` (optional): Number of most recent metrics to retrieve (default: 50).
        *   `startDate` (optional): ISO date string to filter metrics from.
        *   `endDate` (optional): ISO date string to filter metrics until.
    *   **Response (200 OK):**
        ```json
        [
          {
            "id": "uuid",
            "monitorId": "uuid",
            "timestamp": "2023-10-27T09:59:00Z",
            "responseTimeMs": 150,
            "statusCode": 200,
            "statusText": "OK",
            "error": null
          },
          {
            "id": "uuid",
            "monitorId": "uuid",
            "timestamp": "2023-10-27T10:00:00Z",
            "responseTimeMs": 210,
            "statusCode": 200,
            "statusText": "OK",
            "error": null
          }
        ]
        ```
    *   **Error (404 Not Found):** Monitor not found or not owned by user.

*   **`GET /monitors/:monitorId/metrics/summary`**
    *   **Description:** Get a summary of metrics for a specific monitor (e.g., average response time, uptime percentage).
    *   **Authorization:** Required (user must own the monitor).
    *   **Query Parameters:**
        *   `interval` (optional): Time interval for summary (e.g., '24h', '7d'). Default: '24h'.
    *   **Response (200 OK):**
        ```json
        {
          "monitorId": "uuid",
          "totalChecks": 1440,
          "successfulChecks": 1435,
          "failedChecks": 5,
          "uptimePercentage": 99.65,
          "averageResponseTimeMs": 185.3,
          "minResponseTimeMs": 50,
          "maxResponseTimeMs": 500,
          "statusCodeCounts": { "200": 1435, "500": 5 }
        }
        ```

### 6. Alert Endpoints

*   **`GET /monitors/:monitorId/alerts`**
    *   **Description:** Get all alert configurations for a specific monitor.
    *   **Authorization:** Required (user must own the monitor).
    *   **Response (200 OK):**
        ```json
        [
          {
            "id": "uuid",
            "monitorId": "uuid",
            "type": "response_time",
            "threshold": 500,
            "condition": "gt",
            "isActive": true,
            "status": "ok",
            "message": "Response time > 500ms"
          },
          {
            "id": "uuid",
            "monitorId": "uuid",
            "type": "status_code",
            "threshold": 400,
            "condition": "gte",
            "isActive": true,
            "status": "alert",
            "message": "Status code >= 400"
          }
        ]
        ```

*   **`POST /monitors/:monitorId/alerts`**
    *   **Description:** Create a new alert configuration for a monitor.
    *   **Authorization:** Required.
    *   **Request Body:**
        ```json
        {
          "type": "response_time", // 'response_time' or 'status_code'
          "threshold": 300,        // e.g., 300ms or 500 (status code)
          "condition": "gt",       // 'gt' (greater than), 'gte' (greater than or equal), 'lt', 'lte', 'eq', 'neq'
          "message": "Response time exceeds 300ms!"
        }
        ```
    *   **Response (201 Created):** New alert object.

*   **`PUT /alerts/:id`**
    *   **Description:** Update an existing alert configuration.
    *   **Authorization:** Required (user must own the monitor associated with the alert).
    *   **Request Body (example):**
        ```json
        {
          "threshold": 400,
          "isActive": false
        }
        ```
    *   **Response (200 OK):** Updated alert object.

*   **`DELETE /alerts/:id`**
    *   **Description:** Delete an alert configuration.
    *   **Authorization:** Required (user must own the monitor associated with the alert).
    *   **Response (204 No Content)**
```