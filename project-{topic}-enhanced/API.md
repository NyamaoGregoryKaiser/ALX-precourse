# Data Visualization Tools System API Documentation

This document outlines the RESTful API endpoints provided by the C++ backend for the Data Visualization Tools System.

**Base URL**: `/api/v1`
**Content-Type**: `application/json` for all request bodies and responses (unless specified otherwise, e.g., for file uploads).

---

## Authentication

All protected endpoints require a valid JSON Web Token (JWT) provided in the `Authorization` header as `Bearer <token>`.

### 1. Register User
Registers a new user account.

*   **URL**: `/api/v1/auth/register`
*   **Method**: `POST`
*   **Request Body**:
    ```json
    {
        "username": "string",
        "email": "string",
        "password": "string"
    }
    ```
*   **Success Response**: `201 Created`
    ```json
    {
        "message": "User registered successfully",
        "user_id": "uuid"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid JSON, missing fields.
    *   `409 Conflict`: User with this email already exists.
    *   `500 Internal Server Error`: Server-side error.

### 2. Login User
Authenticates a user and issues a JWT.

*   **URL**: `/api/v1/auth/login`
*   **Method**: `POST`
*   **Request Body**:
    ```json
    {
        "email": "string",
        "password": "string"
    }
    ```
*   **Success Response**: `200 OK`
    ```json
    {
        "message": "Login successful",
        "token": "jwt_token_string",
        "user_id": "uuid"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid JSON, missing fields.
    *   `401 Unauthorized`: Invalid credentials.
    *   `500 Internal Server Error`: Server-side error.

---

## Data Sources (Protected)

Requires `Authorization: Bearer <token>` header.

### 1. Create Data Source
Registers a new data source. For CSVs, the `data_base64` field can contain the file content.

*   **URL**: `/api/v1/data-sources`
*   **Method**: `POST`
*   **Request Body**:
    ```json
    {
        "name": "string",
        "type": "string",                 // e.g., "CSV", "PostgreSQL", "API"
        "connection_string": "string",    // Optional: connection details for DB/API
        "schema_definition": {},          // Optional: JSON object for data schema
        "data_base64": "string"           // Optional: Base64 encoded file content for file types (e.g., CSV)
    }
    ```
*   **Success Response**: `201 Created`
    ```json
    {
        "message": "Data source created successfully",
        "id": "uuid",
        "name": "string"
    }
    ```
*   **Error Responses**: `400`, `401`, `403`, `500`.

### 2. Get All Data Sources for User
Retrieves a list of all data sources owned by the authenticated user.

*   **URL**: `/api/v1/data-sources`
*   **Method**: `GET`
*   **Success Response**: `200 OK`
    ```json
    [
        {
            "id": "uuid",
            "user_id": "uuid",
            "name": "string",
            "type": "string",
            "connection_string": "string",
            "schema_definition": {},
            "file_path": "string",
            "created_at": "datetime_iso8601",
            "updated_at": "datetime_iso8601"
        }
    ]
    ```
*   **Error Responses**: `401`, `403`, `500`.

### 3. Get Data Source by ID
Retrieves a specific data source by its ID.

*   **URL**: `/api/v1/data-sources/{id}`
*   **Method**: `GET`
*   **Success Response**: `200 OK` (See structure above)
*   **Error Responses**:
    *   `404 Not Found`: Data source not found or unauthorized.
    *   `401`, `403`, `500`.

### 4. Update Data Source
Updates an existing data source.

*   **URL**: `/api/v1/data-sources/{id}`
*   **Method**: `PUT`
*   **Request Body**: (Partial updates are allowed)
    ```json
    {
        "name": "string",
        "type": "string",
        "connection_string": "string",
        "schema_definition": {}
    }
    ```
*   **Success Response**: `200 OK`
    ```json
    {
        "message": "Data source updated successfully"
    }
    ```
*   **Error Responses**: `400`, `401`, `403`, `404`, `500`.

### 5. Delete Data Source
Deletes a data source and its associated files/configurations.

*   **URL**: `/api/v1/data-sources/{id}`
*   **Method**: `DELETE`
*   **Success Response**: `204 No Content`
*   **Error Responses**: `401`, `403`, `404`, `500`.

### 6. Process Data Source
Triggers processing (e.g., parsing CSV, querying DB) for a data source and returns its raw/processed data.

*   **URL**: `/api/v1/data-sources/{id}/process`
*   **Method**: `POST` (or GET if only fetching, POST if transformations/filters are in body)
*   **Request Body (Optional for POST)**:
    ```json
    {
        "filters": [...],
        "aggregations": [...]
    }
    ```
*   **Success Response**: `200 OK`
    ```json
    [
        {"column1": "value1", "column2": 123},
        {"column1": "valueX", "column2": 456}
    ]
    ```
*   **Error Responses**: `400`, `401`, `403`, `404`, `500`.

---

## Visualizations (Protected)

Requires `Authorization: Bearer <token>` header.

### 1. Create Visualization
Creates a new visualization linked to a data source.

*   **URL**: `/api/v1/visualizations`
*   **Method**: `POST`
*   **Request Body**:
    ```json
    {
        "name": "string",
        "description": "string",          // Optional
        "data_source_id": "uuid",
        "type": "string",                 // e.g., "bar_chart", "line_chart"
        "configuration": {}               // JSON object for chart specific settings
    }
    ```
*   **Success Response**: `201 Created`
    ```json
    {
        "message": "Visualization created successfully",
        "id": "uuid",
        "name": "string"
    }
    ```
*   **Error Responses**: `400`, `401`, `403`, `500`.

### 2. Get All Visualizations for User
Retrieves a list of all visualizations owned by the authenticated user.

*   **URL**: `/api/v1/visualizations`
*   **Method**: `GET`
*   **Success Response**: `200 OK`
    ```json
    [
        {
            "id": "uuid",
            "user_id": "uuid",
            "name": "string",
            "description": "string",
            "data_source_id": "uuid",
            "type": "string",
            "configuration": {},
            "created_at": "datetime_iso8601",
            "updated_at": "datetime_iso8601"
        }
    ]
    ```
*   **Error Responses**: `401`, `403`, `500`.

### 3. Get Visualization by ID
Retrieves a specific visualization by its ID.

*   **URL**: `/api/v1/visualizations/{id}`
*   **Method**: `GET`
*   **Success Response**: `200 OK` (See structure above)
*   **Error Responses**: `404`, `401`, `403`, `500`.

### 4. Update Visualization
Updates an existing visualization.

*   **URL**: `/api/v1/visualizations/{id}`
*   **Method**: `PUT`
*   **Request Body**: (Partial updates allowed)
    ```json
    {
        "name": "string",
        "description": "string",
        "data_source_id": "uuid",
        "type": "string",
        "configuration": {}
    }
    ```
*   **Success Response**: `200 OK`
    ```json
    {
        "message": "Visualization updated successfully"
    }
    ```
*   **Error Responses**: `400`, `401`, `403`, `404`, `500`.

### 5. Delete Visualization
Deletes a visualization.

*   **URL**: `/api/v1/visualizations/{id}`
*   **Method**: `DELETE`
*   **Success Response**: `204 No Content`
*   **Error Responses**: `401`, `403`, `404`, `500`.

### 6. Get Visualization Data
Retrieves the processed data required to render a specific visualization. The backend applies transformations defined in the visualization's configuration to its associated data source.

*   **URL**: `/api/v1/visualizations/{id}/data`
*   **Method**: `GET`
*   **Query Parameters (Optional)**:
    *   `filters`: JSON array string of additional filters (e.g., `?filters=[{"field":"age","op":">","value":30}]`)
    *   `limit`, `offset`, `sort_by`, `sort_order` for pagination/dynamic sorting.
*   **Success Response**: `200 OK`
    ```json
    [
        {"category": "A", "value": 100},
        {"category": "B", "value": 150}
    ]
    ```
*   **Error Responses**: `400`, `401`, `403`, `404`, `500`.

---

## Dashboards (Protected)

Requires `Authorization: Bearer <token>` header.

*(Endpoints for Dashboards are similar to Visualizations and Data Sources - CRUD operations with a `layout_config` JSON field. Omitted for brevity but would follow the same pattern.)*

---

## Common Error Responses

*   `400 Bad Request`: Client-side error, e.g., invalid JSON, missing required fields, invalid parameters.
    ```json
    {"error": "Invalid JSON format"}
    ```
*   `401 Unauthorized`: Authentication required or invalid token provided.
    ```json
    {"error": "Unauthorized"}
    ```
*   `403 Forbidden`: Authenticated user does not have permission to access the resource.
    ```json
    {"error": "Forbidden", "details": "Invalid JWT signature"}
    ```
*   `404 Not Found`: The requested resource could not be found.
    ```json
    {"error": "Not Found"}
    ```
*   `429 Too Many Requests`: Rate limit exceeded.
    ```json
    {"error": "Too Many Requests", "retry_after": 60}
    ```
*   `500 Internal Server Error`: An unexpected error occurred on the server.
    ```json
    {"error": "Internal Server Error", "details": "Specific error message"}
    ```
---