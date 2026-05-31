# API Documentation - Data Visualization Tools System

This document provides a comprehensive overview of the RESTful API for the Data Visualization Tools System. The API is built using Flask-RESTX, which automatically generates interactive Swagger UI documentation, available at `/swagger-ui` when the application is running.

**Base URL**: `http://localhost:5000` (or your deployed domain)

## Authentication

All protected endpoints require a JWT (JSON Web Token) in the `Authorization` header, formatted as `Bearer <access_token>`.

### Register User
`POST /auth/register`

Creates a new user account.
*   **Request Body**: `application/json`
    ```json
    {
      "username": "string",
      "email": "user@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Responses**:
    *   `201 Created`:
        ```json
        {
          "message": "User registered successfully",
          "access_token": "eyJ...",
          "refresh_token": "eyJ...",
          "user": {
            "id": 1,
            "username": "string",
            "email": "user@example.com",
            "created_at": "YYYY-MM-DDTHH:MM:SS.sssZ",
            "updated_at": "YYYY-MM-DDTHH:MM:SS.sssZ"
          }
        }
        ```
    *   `400 Bad Request`: Validation error.
    *   `409 Conflict`: User with email/username already exists.

### Login User
`POST /auth/login`

Authenticates a user and returns JWT access and refresh tokens.
*   **Request Body**: `application/json`
    ```json
    {
      "email": "user@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Responses**:
    *   `200 OK`: (Same as `201 Created` for register, but message will be "Logged in successfully")
    *   `401 Unauthorized`: Invalid credentials.

### Refresh Token
`POST /auth/refresh`

Uses a refresh token to obtain a new access token. Requires a valid refresh token in the Authorization header.
*   **Request Headers**: `Authorization: Bearer <refresh_token>`
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "access_token": "eyJ..."
        }
        ```
    *   `401 Unauthorized`: Refresh token missing or invalid.

---

## User Endpoints

### Get Current User Profile
`GET /users/me`

Retrieves the profile information of the authenticated user.
*   **Requires Authentication**: Yes
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "id": 1,
          "username": "currentuser",
          "email": "current@example.com",
          "created_at": "YYYY-MM-DDTHH:MM:SS.sssZ",
          "updated_at": "YYYY-MM-DDTHH:MM:SS.sssZ"
        }
        ```
    *   `401 Unauthorized`: Token missing or invalid.

### Update Current User Profile
`PUT /users/me`

Updates the profile information of the authenticated user.
*   **Requires Authentication**: Yes
*   **Request Body**: `application/json` (partial updates allowed)
    ```json
    {
      "username": "newusername",
      "email": "newemail@example.com"
    }
    ```
*   **Responses**:
    *   `200 OK`: Updated user profile.
    *   `400 Bad Request`: Validation error or duplicate username/email.
    *   `401 Unauthorized`.

### Delete Current User Account
`DELETE /users/me`

Deletes the authenticated user's account and all associated data (data sources, visualizations, dashboards).
*   **Requires Authentication**: Yes
*   **Responses**:
    *   `204 No Content`: Account deleted successfully.
    *   `401 Unauthorized`.

---

## Data Source Endpoints

### List Data Sources
`GET /data-sources/`

Retrieves a list of all data sources owned by the authenticated user.
*   **Requires Authentication**: Yes
*   **Responses**:
    *   `200 OK`: `[{DataSourceObject}, ...]`
    *   `401 Unauthorized`.

### Create Data Source (Non-File)
`POST /data-sources/`

Creates a new data source that connects to a database or API. For file uploads, use `/data-sources/upload`.
*   **Requires Authentication**: Yes
*   **Request Body**: `application/json`
    ```json
    {
      "name": "My PostgreSQL Data",
      "description": "Customer transaction data",
      "type": "PostgreSQL",
      "connection_string": "postgresql://user:pass@host:port/dbname"
    }
    ```
*   **Responses**:
    *   `201 Created`: `DataSourceObject`
    *   `400 Bad Request`: Validation error or if `type` is 'CSV' or 'Excel'.
    *   `409 Conflict`: Data source with same name already exists for user.

### Upload File Data Source
`POST /data-sources/upload`

Uploads a CSV or Excel file to create a new data source.
*   **Requires Authentication**: Yes
*   **Request Body**: `multipart/form-data`
    *   `file`: (File) The CSV or Excel file to upload.
    *   `name`: (string, required) Name for the data source.
    *   `description`: (string, optional) Description for the data source.
*   **Responses**:
    *   `201 Created`: `DataSourceObject` (including `file_path` and `schema_json`).
    *   `400 Bad Request`: No file, unsupported type, empty file, or validation error.
    *   `413 Payload Too Large`: If file exceeds configured limit.

### Get Data Source by ID
`GET /data-sources/<int:source_id>`

Retrieves a single data source by its ID.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the data source or be an admin.
*   **Responses**:
    *   `200 OK`: `DataSourceObject`
    *   `403 Forbidden`: Not authorized to access this data source.
    *   `404 Not Found`.

### Update Data Source by ID
`PUT /data-sources/<int:source_id>`

Updates an existing data source.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the data source or be an admin.
*   **Request Body**: `application/json` (partial updates allowed)
    ```json
    {
      "name": "Updated Source Name",
      "description": "Revised description"
    }
    ```
*   **Note**: `type` and `file_path` cannot be updated via this endpoint.
*   **Responses**:
    *   `200 OK`: Updated `DataSourceObject`.
    *   `400 Bad Request`: Validation error.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `409 Conflict`: Duplicate name for user.

### Delete Data Source by ID
`DELETE /data-sources/<int:source_id>`

Deletes a data source. This will also cascade delete all associated visualizations.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the data source or be an admin.
*   **Responses**:
    *   `204 No Content`: Data source deleted.
    *   `403 Forbidden`.
    *   `404 Not Found`.

### Get Data Source Schema
`GET /data-sources/<int:source_id>/schema`

Retrieves the detected schema (columns, data types) for a data source.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the data source or be an admin.
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "columns": ["Date", "Category", "Value"],
          "rows": 100,
          "dtypes": {
            "Date": "datetime64[ns]",
            "Category": "object",
            "Value": "int64"
          }
        }
        ```
    *   `403 Forbidden`.
    *   `404 Not Found`.

---

## Visualization Endpoints

### List Visualizations
`GET /visualizations/`

Retrieves a list of all visualizations owned by the authenticated user.
*   **Requires Authentication**: Yes
*   **Responses**:
    *   `200 OK`: `[{VisualizationObject}, ...]`
    *   `401 Unauthorized`.

### Create Visualization
`POST /visualizations/`

Creates a new visualization.
*   **Requires Authentication**: Yes
*   **Request Body**: `application/json`
    ```json
    {
      "name": "Monthly Sales Bar Chart",
      "description": "Shows total sales per month",
      "type": "bar",
      "config_json": {
        "chart_type": "bar",
        "x_axis": "Month",
        "y_axis": "Total Sales",
        "title": "Monthly Sales"
      },
      "query_json": {
        "group_by": ["Month"],
        "aggregate": {"Sales": "sum"},
        "sort_by": [{"column": "Month", "order": "asc"}]
      },
      "data_source_id": 1
    }
    ```
*   **Responses**:
    *   `201 Created`: `VisualizationObject`
    *   `400 Bad Request`: Validation error.
    *   `403 Forbidden`: User does not own the `data_source_id`.
    *   `404 Not Found`: Data source not found.
    *   `409 Conflict`: Visualization with same name already exists for user.

### Get Visualization by ID
`GET /visualizations/<int:viz_id>`

Retrieves a single visualization by its ID.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the visualization or be an admin.
*   **Responses**:
    *   `200 OK`: `VisualizationObject`
    *   `403 Forbidden`.
    *   `404 Not Found`.

### Update Visualization by ID
`PUT /visualizations/<int:viz_id>`

Updates an existing visualization.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the visualization or be an admin.
*   **Request Body**: `application/json` (partial updates allowed)
    ```json
    {
      "name": "Updated Sales Line Chart",
      "config_json": {
        "chart_type": "line",
        "color_by": "Region"
      }
    }
    ```
*   **Responses**:
    *   `200 OK`: Updated `VisualizationObject`.
    *   `400 Bad Request`: Validation error.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `409 Conflict`: Duplicate name for user.

### Delete Visualization by ID
`DELETE /visualizations/<int:viz_id>`

Deletes a visualization. This will also remove it from any dashboards it's associated with.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the visualization or be an admin.
*   **Responses**:
    *   `204 No Content`: Visualization deleted.
    *   `403 Forbidden`.
    *   `404 Not Found`.

### Get Processed Visualization Data
`GET /visualizations/<int:viz_id>/data`

Retrieves the processed and formatted data for a specific visualization, ready for client-side rendering. This endpoint applies the `query_json` and `config_json` from the visualization definition to its associated data source. Data is cached for performance.
*   **Requires Authentication**: Yes
*   **Authorization**: User must own the visualization or the associated data source, or be an admin.
*   **Responses**:
    *   `200 OK`:
        ```json
        {
          "data": [
            {"x": "Category A", "y": 120},
            {"x": "Category B", "y": 90}
          ]
        }
        ```