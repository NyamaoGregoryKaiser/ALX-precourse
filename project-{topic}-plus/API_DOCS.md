```markdown
# ALX Data Visualization Tool - API Documentation

This document provides a detailed overview of the RESTful API endpoints for the ALX Data Visualization Tool. The API is designed to be consumed by a frontend application (e.g., React, Angular, Vue.js) to manage users, data sources, dashboards, and charts.

## Base URL

The base URL for all API endpoints is `http://localhost:8080/api` (or your deployment's base URL).

## Authentication

All protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token.

**Header Example:**
`Authorization: Bearer <your_jwt_token_here>`

## Error Responses

The API returns consistent JSON error responses for different error scenarios.

**Example Error Response:**
```json
{
  "timestamp": "2023-10-27T10:30:00.123456",
  "message": "Resource not found with id: 100",
  "details": "uri=/api/dashboards/100",
  "errorCode": "NOT_FOUND"
}
```

**Common Error Codes:**
*   `NOT_FOUND`: Resource not found (HTTP 404)
*   `UNAUTHORIZED`: Authentication failed or missing token (HTTP 401)
*   `FORBIDDEN`: Access denied due to insufficient permissions (HTTP 403)
*   `BAD_REQUEST`: Invalid request payload or parameters, validation errors (HTTP 400)
*   `VALIDATION_ERROR`: Specific validation errors (HTTP 400), includes `fieldErrors` map for details.
*   `BAD_CREDENTIALS`: Incorrect username or password during login (HTTP 401)
*   `RATE_LIMIT_EXCEEDED`: Too many requests in a given period (HTTP 429)
*   `INTERNAL_SERVER_ERROR`: Unexpected server error (HTTP 500)

## Endpoints

---

### 1. Authentication Endpoints (`/api/auth`)

#### 1.1 Register User
*   **URL:** `/api/auth/register`
*   **Method:** `POST`
*   **Description:** Registers a new user with default `USER` role.
*   **Request Body:** `application/json`
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "strongpassword123"
    }
    ```
*   **Response (201 Created):** `application/json`
    ```json
    {
      "id": 3,
      "username": "newuser",
      "email": "newuser@example.com",
      "roles": ["USER"],
      "createdAt": "2023-10-27T10:30:00.123456",
      "updatedAt": "2023-10-27T10:30:00.123456"
    }
    ```
*   **Error Codes:** `BAD_REQUEST` (e.g., username/email already exists, invalid input)

#### 1.2 Login User
*   **URL:** `/api/auth/login`
*   **Method:** `POST`
*   **Description:** Authenticates a user and returns a JWT token.
*   **Request Body:** `application/json`
    ```json
    {
      "username": "newuser",
      "password": "strongpassword123"
    }
    ```
*   **Response (200 OK):** `application/json`
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "username": "newuser",
      "message": "Login successful"
    }
    ```
*   **Error Codes:** `BAD_CREDENTIALS`, `BAD_REQUEST` (invalid input)

---

### 2. User Management Endpoints (`/api/users`)

*   **Roles:**
    *   `ADMIN`: Can perform any operation on any user.
    *   `USER`: Can view/update/delete their own profile. Cannot change roles.

#### 2.1 Get User by ID
*   **URL:** `/api/users/{id}`
*   **Method:** `GET`
*   **Description:** Retrieves a user's details.
*   **Path Variable:** `id` (Long) - The user's ID.
*   **Response (200 OK):** `application/json` (UserDto, excluding password)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 2.2 Get All Users
*   **URL:** `/api/users`
*   **Method:** `GET`
*   **Description:** Retrieves a paginated list of all users. (Admin only)
*   **Query Parameters:**
    *   `page` (int, default: 0)
    *   `size` (int, default: 10)
    *   `sort` (String[], default: `id,asc`) - e.g., `sort=username,desc&sort=email,asc`
*   **Response (200 OK):** `application/json` (Page<UserDto>)
*   **Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`

#### 2.3 Update User
*   **URL:** `/api/users/{id}`
*   **Method:** `PUT`
*   **Description:** Updates an existing user's details.
*   **Path Variable:** `id` (Long) - The user's ID.
*   **Request Body:** `application/json` (UserDto)
    ```json
    {
      "username": "updated_user",
      "email": "updated@example.com",
      "password": "newstrongpassword"
      // Roles can only be updated by ADMIN
    }
    ```
*   **Response (200 OK):** `application/json` (updated UserDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`

#### 2.4 Delete User
*   **URL:** `/api/users/{id}`
*   **Method:** `DELETE`
*   **Description:** Deletes a user.
*   **Path Variable:** `id` (Long) - The user's ID.
*   **Response (204 No Content)**
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

---

### 3. Data Source Endpoints (`/api/data-sources`)

*   **Roles:**
    *   `ADMIN`: Can perform any operation on any data source.
    *   `USER`: Can create, view, update, delete their own data sources.

#### 3.1 Create Data Source
*   **URL:** `/api/data-sources`
*   **Method:** `POST`
*   **Description:** Creates a new data source.
*   **Request Body:** `application/json`
    ```json
    {
      "name": "My Sales CSV",
      "connectionDetails": "path/to/sales.csv",
      "type": "CSV",
      "schemaDefinition": "{\"columns\": [{\"name\": \"date\", \"type\": \"date\"}, {\"name\": \"revenue\", \"type\": \"number\"}]}"
    }
    ```
*   **Response (201 Created):** `application/json` (DataSourceDto)
*   **Error Codes:** `UNAUTHORIZED`, `BAD_REQUEST`

#### 3.2 Get Data Source by ID
*   **URL:** `/api/data-sources/{id}`
*   **Method:** `GET`
*   **Description:** Retrieves details of a specific data source.
*   **Path Variable:** `id` (Long)
*   **Response (200 OK):** `application/json` (DataSourceDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 3.3 Get All Data Sources
*   **URL:** `/api/data-sources`
*   **Method:** `GET`
*   **Description:** Retrieves a paginated list of data sources. Admins see all; Users see their own.
*   **Query Parameters:** `page`, `size`, `sort`
*   **Response (200 OK):** `application/json` (Page<DataSourceDto>)
*   **Error Codes:** `UNAUTHORIZED`

#### 3.4 Update Data Source
*   **URL:** `/api/data-sources/{id}`
*   **Method:** `PUT`
*   **Description:** Updates an existing data source.
*   **Path Variable:** `id` (Long)
*   **Request Body:** `application/json` (DataSourceDto)
*   **Response (200 OK):** `application/json` (updated DataSourceDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`

#### 3.5 Delete Data Source
*   **URL:** `/api/data-sources/{id}`
*   **Method:** `DELETE`
*   **Description:** Deletes a data source.
*   **Path Variable:** `id` (Long)
*   **Response (204 No Content)**
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 3.6 Get Data Source Data
*   **URL:** `/api/data-sources/{id}/data`
*   **Method:** `GET`
*   **Description:** Fetches and processes raw data points from the specified data source.
*   **Path Variable:** `id` (Long)
*   **Response (200 OK):** `application/json` (List<DataPointDto>)
    ```json
    [
      {"category": "A", "value": 10},
      {"category": "B", "value": 20}
    ]
    ```
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR` (if data processing fails)

---

### 4. Dashboard Endpoints (`/api/dashboards`)

*   **Roles:**
    *   `ADMIN`: Can perform any operation on any dashboard.
    *   `USER`: Can create, view, update, delete their own dashboards.

#### 4.1 Create Dashboard
*   **URL:** `/api/dashboards`
*   **Method:** `POST`
*   **Description:** Creates a new dashboard.
*   **Request Body:** `application/json`
    ```json
    {
      "name": "Quarterly Performance",
      "description": "Dashboard for Q3 2023 performance review."
    }
    ```
*   **Response (201 Created):** `application/json` (DashboardDto)
*   **Error Codes:** `UNAUTHORIZED`, `BAD_REQUEST`

#### 4.2 Get Dashboard by ID
*   **URL:** `/api/dashboards/{id}`
*   **Method:** `GET`
*   **Description:** Retrieves details of a specific dashboard, optionally including its charts.
*   **Path Variable:** `id` (Long)
*   **Response (200 OK):** `application/json` (DashboardDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 4.3 Get All Dashboards
*   **URL:** `/api/dashboards`
*   **Method:** `GET`
*   **Description:** Retrieves a paginated list of dashboards. Admins see all; Users see their own.
*   **Query Parameters:** `page`, `size`, `sort`
*   **Response (200 OK):** `application/json` (Page<DashboardDto>)
*   **Error Codes:** `UNAUTHORIZED`

#### 4.4 Update Dashboard
*   **URL:** `/api/dashboards/{id}`
*   **Method:** `PUT`
*   **Description:** Updates an existing dashboard.
*   **Path Variable:** `id` (Long)
*   **Request Body:** `application/json` (DashboardDto)
*   **Response (200 OK):** `application/json` (updated DashboardDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`

#### 4.5 Delete Dashboard
*   **URL:** `/api/dashboards/{id}`
*   **Method:** `DELETE`
*   **Description:** Deletes a dashboard and all associated charts.
*   **Path Variable:** `id` (Long)
*   **Response (204 No Content)**
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

---

### 5. Chart Endpoints (`/api/charts`)

*   **Roles:**
    *   `ADMIN`: Can perform any operation on any chart.
    *   `USER`: Can create, view, update, delete charts within their owned dashboards and using their owned data sources.

#### 5.1 Create Chart
*   **URL:** `/api/charts`
*   **Method:** `POST`
*   **Description:** Creates a new chart.
*   **Request Body:** `application/json`
    ```json
    {
      "title": "Revenue by Product Category",
      "description": "Bar chart showing revenue per category.",
      "type": "BAR",
      "dataSourceId": 1,
      "dashboardId": 1,
      "configuration": "{\"xAxis\":\"category\",\"yAxis\":\"revenue\",\"color\":\"product\"}"
    }
    ```
*   **Response (201 Created):** `application/json` (ChartDto)
*   **Error Codes:** `NOT_FOUND` (if dataSourceId/dashboardId invalid), `UNAUTHORIZED`, `BAD_REQUEST`

#### 5.2 Get Chart by ID
*   **URL:** `/api/charts/{id}`
*   **Method:** `GET`
*   **Description:** Retrieves details of a specific chart.
*   **Path Variable:** `id` (Long)
*   **Response (200 OK):** `application/json` (ChartDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 5.3 Get Charts by Dashboard ID
*   **URL:** `/api/charts/dashboard/{dashboardId}`
*   **Method:** `GET`
*   **Description:** Retrieves all charts belonging to a specific dashboard.
*   **Path Variable:** `dashboardId` (Long)
*   **Response (200 OK):** `application/json` (List<ChartDto>)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 5.4 Update Chart
*   **URL:** `/api/charts/{id}`
*   **Method:** `PUT`
*   **Description:** Updates an existing chart.
*   **Path Variable:** `id` (Long)
*   **Request Body:** `application/json` (ChartDto)
*   **Response (200 OK):** `application/json` (updated ChartDto)
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`

#### 5.5 Delete Chart
*   **URL:** `/api/charts/{id}`
*   **Method:** `DELETE`
*   **Description:** Deletes a chart.
*   **Path Variable:** `id` (Long)
*   **Response (204 No Content)**
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`

#### 5.6 Get Chart Data
*   **URL:** `/api/charts/{id}/data`
*   **Method:** `GET`
*   **Description:** Fetches and processes data points specific for rendering the chart, potentially applying aggregations/filters defined in the chart's configuration.
*   **Path Variable:** `id` (Long)
*   **Response (200 OK):** `application/json` (List<DataPointDto>)
    ```json
    [
      {"category": "Electronics", "total_sales": 5000},
      {"category": "Clothing", "total_sales": 2500}
    ]
    ```
*   **Error Codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR`

---

## Swagger UI

For interactive exploration and testing of the API, please visit the Swagger UI at `http://localhost:8080/swagger-ui.html` after starting the application.
```