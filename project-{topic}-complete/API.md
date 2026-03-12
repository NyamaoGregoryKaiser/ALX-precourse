# API Documentation for Data Visualization Platform

This document describes the RESTful API endpoints for the Data Visualization Platform.

**Base URL:** `/api` (e.g., `http://localhost:5000/api`)

## Authentication

All protected endpoints require a valid JWT (JSON Web Token) sent as an `HttpOnly` cookie named `token`.

### `POST /auth/register`
Registers a new user.
*   **Request Body:**
    ```json
    {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "strongpassword123"
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
*   **Error (409 Conflict):** If email or username already exists.
*   **Error (400 Bad Request):** If required fields are missing.

### `POST /auth/login`
Logs in a user and sets an `httpOnly` JWT cookie.
*   **Request Body:**
    ```json
    {
        "email": "user@example.com",
        "password": "strongpassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
        "message": "Logged in successfully",
        "user": {
            "id": "uuid",
            "username": "existinguser",
            "email": "existinguser@example.com",
            "role": "user"
        }
    }
    ```
*   **Error (401 Unauthorized):** Invalid credentials.
*   **Error (400 Bad Request):** If email or password missing.

### `POST /auth/logout`
Logs out a user by clearing the JWT cookie.
*   **Response (200 OK):**
    ```json
    {
        "message": "Logged out successfully"
    }
    ```

### `GET /auth/profile` (Protected)
Retrieves the profile of the authenticated user.
*   **Response (200 OK):**
    ```json
    {
        "id": "uuid",
        "username": "testuser",
        "email": "test@example.com",
        "role": "user",
        "createdAt": "2023-10-27T10:00:00.000Z"
    }
    ```
*   **Error (401 Unauthorized):** If no valid token is provided.
*   **Error (404 Not Found):** If user profile cannot be found (rare).

## Users (Protected, Admin-only for some)

### `GET /users` (Protected, Admin-only)
Retrieves all users.
*   **Response (200 OK):** `Array<UserObject>`
*   **Error (401 Unauthorized):** Invalid token.
*   **Error (403 Forbidden):** Not an admin user.

### `GET /users/:id` (Protected)
Retrieves a user by ID. A regular user can only fetch their own profile. Admin can fetch any.
*   **Response (200 OK):** `UserObject`
*   **Error (401 Unauthorized):** Invalid token.
*   **Error (403 Forbidden):** User trying to access another user's profile without admin role.
*   **Error (404 Not Found):** User not found.

## Data Sources (Protected)

### `POST /data-sources` (Protected)
Creates a new data source.
*   **Request Body:**
    ```json
    {
        "name": "My Sales Data",
        "type": "json_data",
        "config": {
            "description": "Sales data from January 2023"
        },
        "schema": [
            { "name": "product", "type": "string" },
            { "name": "sales", "type": "number" },
            { "name": "date", "type": "date" }
        ],
        "data": [
            { "product": "Item A", "sales": 100, "date": "2023-01-01" },
            { "product": "Item B", "sales": 150, "date": "2023-01-02" }
        ]
    }
    ```
*   **Response (201 Created):** `DataSourceObject`
*   **Error (400 Bad Request):** Missing required fields.

### `GET /data-sources` (Protected)
Retrieves all data sources for the authenticated user.
*   **Response (200 OK):** `Array<DataSourceObject>`

### `GET /data-sources/:id` (Protected)
Retrieves a single data source by ID.
*   **Response (200 OK):** `DataSourceObject`
*   **Error (404 Not Found):** Data source not found or not owned by user.

### `PUT /data-sources/:id` (Protected)
Updates an existing data source.
*   **Request Body:** (Partial updates allowed)
    ```json
    {
        "name": "Updated Sales Data",
        "config": { "description": "Updated sales data" }
    }
    ```
*   **Response (200 OK):** `UpdatedDataSourceObject`
*   **Error (404 Not Found):** Data source not found or not owned by user.

### `DELETE /data-sources/:id` (Protected)
Deletes a data source.
*   **Response (204 No Content):** On successful deletion.
*   **Error (404 Not Found):** Data source not found or not owned by user.

### `POST /data-sources/:id/process` (Protected)
Retrieves processed data for a given data source, applying optional filters and aggregations. Useful for data preview during visualization creation.
*   **Request Body:** (Optional)
    ```json
    {
        "filters": [
            { "field": "sales", "operator": "gte", "value": 50 }
        ],
        "groupBy": "product",
        "aggregates": [
            { "field": "sales", "operation": "sum" }
        ]
    }
    ```
*   **Response (200 OK):** `Array<ProcessedDataObject>`
*   **Error (404 Not Found):** Data source not found or not owned by user.
*   **Error (500 Internal Server Error):** If data processing fails.

## Visualizations (Protected)

### `POST /visualizations` (Protected)
Creates a new visualization.
*   **Request Body:**
    ```json
    {
        "name": "Sales by Product Bar Chart",
        "dataSourceId": "uuid-of-data-source",
        "type": "bar",
        "config": {
            "title": "Sales by Product",
            "xAxis": "product",
            "yAxis": "total_sales",
            "colorField": "product"
        },
        "filters": [],
        "groupBy": "product",
        "aggregates": [
            { "field": "sales", "operation": "sum", "alias": "total_sales" }
        ]
    }
    ```
*   **Response (201 Created):** `VisualizationObject`
*   **Error (400 Bad Request):** Missing required fields or invalid `dataSourceId`.

### `GET /visualizations` (Protected)
Retrieves all visualizations for the authenticated user.
*   **Response (200 OK):** `Array<VisualizationObject>`

### `GET /visualizations/:id` (Protected)
Retrieves a single visualization by ID.
*   **Response (200 OK):** `VisualizationObject`
*   **Error (404 Not Found):** Visualization not found or not owned by user.

### `PUT /visualizations/:id` (Protected)
Updates an existing visualization.
*   **Request Body:** (Partial updates allowed)
    ```json
    {
        "name": "Updated Sales Bar Chart",
        "config": { "title": "Updated Title" }
    }
    ```
*   **Response (200 OK):** `UpdatedVisualizationObject`
*   **Error (404 Not Found):** Visualization not found or not owned by user.

### `DELETE /visualizations/:id` (Protected)
Deletes a visualization.
*   **Response (204 No Content):** On successful deletion.
*   **Error (404 Not Found):** Visualization not found or not owned by user.

### `POST /visualizations/:id/data` (Protected)
Retrieves the processed data specific to a visualization's configuration. This endpoint combines the `dataSource` data with the `visualization`'s filters and aggregations.
*   **Response (200 OK):** `Array<ProcessedDataObject>`
*   **Error (404 Not Found):** Visualization or its associated data source not found or unauthorized.
*   **Error (500 Internal Server Error):** Data processing failed.

## Dashboards (Protected)

### `POST /dashboards` (Protected)
Creates a new dashboard.
*   **Request Body:**
    ```json
    {
        "name": "My First Dashboard",
        "description": "Overview of key metrics",
        "layout": [
            { "i": "uuid-of-visualization-1", "x": 0, "y": 0, "w": 6, "h": 4 },
            { "i": "uuid-of-visualization-2", "x": 6, "y": 0, "w": 6, "h": 4 }
        ]
    }
    ```
*   **Response (201 Created):** `DashboardObject`
*   **Error (400 Bad Request):** Missing required fields.

### `GET /dashboards` (Protected)
Retrieves all dashboards for the authenticated user.
*   **Response (200 OK):** `Array<DashboardObject>`

### `GET /dashboards/:id` (Protected)
Retrieves a single dashboard by ID.
*   **Response (200 OK):** `DashboardObject` (including references to visualizations, potentially with full visualization objects if eager loaded).
*   **Error (404 Not Found):** Dashboard not found or not owned by user.

### `PUT /dashboards/:id` (Protected)
Updates an existing dashboard.
*   **Request Body:** (Partial updates allowed)
    ```json
    {
        "name": "Renamed Dashboard",
        "layout": [
            { "i": "uuid-of-visualization-1", "x": 0, "y": 0, "w": 12, "h": 6 }
        ]
    }
    ```
*   **Response (200 OK):** `UpdatedDashboardObject`
*   **Error (404 Not Found):** Dashboard not found or not owned by user.

### `DELETE /dashboards/:id` (Protected)
Deletes a dashboard.
*   **Response (204 No Content):** On successful deletion.
*   **Error (404 Not Found):** Dashboard not found or not owned by user.

---
**Note:** `UUID` refers to a Universally Unique Identifier string.
`Object` refers to a JSON object representation of the resource.