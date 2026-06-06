# Data Visualization Platform API Documentation

This document provides an overview and specification of the RESTful API endpoints for the Data Visualization Platform. The API is built with Node.js/Express and TypeScript, and documented using OpenAPI 3.0 (Swagger).

---

## Accessing Swagger UI

When the backend server is running, you can access the interactive Swagger UI at:
`http://localhost:5000/api-docs`

This UI allows you to explore all endpoints, their parameters, response formats, and even execute requests directly.

---

## API Base URL

`http://localhost:5000/api/v1` (for local development)

---

## Authentication

All protected endpoints require a JSON Web Token (JWT) sent in the `Authorization` header as a Bearer token:

`Authorization: Bearer <your_jwt_token>`

You can obtain a JWT by calling the `POST /api/v1/auth/login` endpoint.

---

## Endpoints Summary

Below is a high-level summary. For full details, refer to the Swagger UI.

### 1. Auth Module

**Tag**: `Auth`
**Description**: User authentication and authorization.

*   `POST /auth/register`
    *   **Summary**: Register a new user.
    *   **Request Body**: `{ username: string, email: string, password: string }`
    *   **Responses**: `201` (User registered), `400` (Invalid input), `409` (Email exists).
*   `POST /auth/login`
    *   **Summary**: Log in a user and get a JWT token.
    *   **Request Body**: `{ email: string, password: string }`
    *   **Responses**: `200` (Login successful, `x-auth-token` header, `user` object in body), `401` (Invalid credentials).
*   `GET /auth/me`
    *   **Summary**: Get details of the current authenticated user.
    *   **Security**: `bearerAuth`
    *   **Responses**: `200` (User data), `401` (Unauthorized).

### 2. User Module

**Tag**: `Users`
**Description**: Manage user accounts (Admin-only operations).

*   `GET /users`
    *   **Summary**: Get all users.
    *   **Security**: `bearerAuth` (Role: `ADMIN`)
    *   **Responses**: `200` (List of users), `401` (Unauthorized), `403` (Forbidden).
*   `GET /users/{id}`
    *   **Summary**: Get user by ID.
    *   **Security**: `bearerAuth` (Role: `ADMIN` or owner)
*   `PUT /users/{id}`
    *   **Summary**: Update user role or details.
    *   **Security**: `bearerAuth` (Role: `ADMIN`)
*   `DELETE /users/{id}`
    *   **Summary**: Delete a user.
    *   **Security**: `bearerAuth` (Role: `ADMIN`)

### 3. Data Sources Module

**Tag**: `Data Sources`
**Description**: Manage connections to external data sources.

*   `POST /data-sources`
    *   **Summary**: Create a new data source connection.
    *   **Security**: `bearerAuth`
    *   **Request Body**: `{ name: string, type: 'POSTGRESQL'|'CSV_UPLOAD', connectionDetails: object }`
*   `GET /data-sources`
    *   **Summary**: Get all data sources for the authenticated user.
    *   **Security**: `bearerAuth`
*   `GET /data-sources/{id}`
    *   **Summary**: Get a data source by ID.
    *   **Security**: `bearerAuth`
*   `PUT /data-sources/{id}`
    *   **Summary**: Update a data source.
    *   **Security**: `bearerAuth`
*   `DELETE /data-sources/{id}`
    *   **Summary**: Delete a data source.
    *   **Security**: `bearerAuth`
*   `POST /data-sources/{id}/test`
    *   **Summary**: Test connection to a data source.
    *   **Security**: `bearerAuth`
*   `POST /data-sources/{id}/execute-query`
    *   **Summary**: Execute a SQL query against a data source.
    *   **Security**: `bearerAuth`
    *   **Request Body**: `{ query: string }`

### 4. Charts Module

**Tag**: `Charts`
**Description**: Manage chart definitions and configurations.

*   `POST /charts`
    *   **Summary**: Create a new chart.
    *   **Security**: `bearerAuth`
    *   **Request Body**: `{ name: string, type: 'BAR'|'LINE'|'PIE', dataSourceId?: string, query?: string, configuration: object }`
*   `GET /charts`
    *   **Summary**: Get all charts for the authenticated user.
    *   **Security**: `bearerAuth`
*   `GET /charts/{id}`
    *   **Summary**: Get a chart by ID.
    *   **Security**: `bearerAuth`
*   `PUT /charts/{id}`
    *   **Summary**: Update a chart.
    *   **Security**: `bearerAuth`
*   `DELETE /charts/{id}`
    *   **Summary**: Delete a chart.
    *   **Security**: `bearerAuth`
*   `POST /charts/{id}/execute` (Deprecated - use data-sources/{id}/execute-query directly, or a dedicated chart data endpoint)
    *   **Summary**: (Internal) Executes the chart's associated query and returns data.
    *   **Security**: `bearerAuth`

### 5. Dashboards Module

**Tag**: `Dashboards`
**Description**: Manage dashboard layouts and chart associations.

*   `POST /dashboards`
    *   **Summary**: Create a new dashboard.
    *   **Security**: `bearerAuth`
    *   **Request Body**: `{ name: string, description?: string, layout?: object[], chartIds?: string[] }`
*   `GET /dashboards`
    *   **Summary**: Get all dashboards for the authenticated user.
    *   **Security**: `bearerAuth`
*   `GET /dashboards/{id}`
    *   **Summary**: Get a dashboard by ID.
    *   **Security**: `bearerAuth`
*   `PUT /dashboards/{id}`
    *   **Summary**: Update a dashboard.
    *   **Security**: `bearerAuth`
*   `DELETE /dashboards/{id}`
    *   **Summary**: Delete a dashboard.
    *   **Security**: `bearerAuth`

---

## Error Handling

The API uses a standardized error response format:

```json
{
  "status": "error",
  "message": "Error description",
  "statusCode": 400
}
```

Common HTTP status codes are used to indicate the type of error:
*   `400 Bad Request`: Invalid input, missing required fields.
*   `401 Unauthorized`: Authentication token missing or invalid.
*   `403 Forbidden`: Authenticated but lacks necessary permissions.
*   `404 Not Found`: Resource not found.
*   `409 Conflict`: Resource already exists (e.g., duplicate email).
*   `500 Internal Server Error`: Server-side error.

---

**Generated from `server/docs/api.json`**
```json
{
  "swagger": "2.0",
  "info": {
    "version": "1.0.0",
    "title": "Data Visualization Platform API",
    "description": "API for managing users, data sources, charts, and dashboards."
  },
  "host": "localhost:5000",
  "basePath": "/api/v1",
  "schemes": ["http", "https"],
  "securityDefinitions": {
    "bearerAuth": {
      "type": "apiKey",
      "name": "Authorization",
      "scheme": "bearer",
      "in": "header"
    }
  },
  "tags": [
    { "name": "Auth", "description": "User authentication and authorization" },
    { "name": "Users", "description": "User management (Admin only)" },
    { "name": "Data Sources", "description": "Manage data source connections" },
    { "name": "Charts", "description": "Create and manage data visualizations" },
    { "name": "Dashboards", "description": "Organize charts into interactive dashboards" }
  ],
  "paths": {
    "/auth/register": {
      "post": {
        "tags": ["Auth"],
        "summary": "Register a new user",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["username", "email", "password"],
              "properties": {
                "username": { "type": "string" },
                "email": { "type": "string", "format": "email" },
                "password": { "type": "string", "format": "password" }
              }
            }
          }
        ],
        "responses": {
          "201": { "description": "User registered successfully" },
          "400": { "description": "Invalid input" },
          "409": { "description": "User with this email already exists" }
        }
      }
    },
    "/auth/login": {
      "post": {
        "tags": ["Auth"],
        "summary": "Log in a user",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["email", "password"],
              "properties": {
                "email": { "type": "string", "format": "email" },
                "password": { "type": "string", "format": "password" }
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "User logged in successfully",
            "headers": {
              "x-auth-token": {
                "type": "string",
                "description": "JWT token for authentication"
              }
            }
          },
          "401": { "description": "Invalid credentials" }
        }
      }
    },
    "/auth/me": {
      "get": {
        "tags": ["Auth"],
        "summary": "Get current authenticated user",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Current user data" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/data-sources": {
      "get": {
        "tags": ["Data Sources"],
        "summary": "Get all data sources for the authenticated user",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of data sources" },
          "401": { "description": "Unauthorized" }
        }
      },
      "post": {
        "tags": ["Data Sources"],
        "summary": "Create a new data source connection",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name", "type", "connectionDetails"],
              "properties": {
                "name": { "type": "string" },
                "type": { "type": "string", "enum": ["POSTGRESQL", "CSV_UPLOAD"] },
                "connectionDetails": { "type": "object" }
              }
            }
          }
        ],
        "responses": {
          "201": { "description": "Data source created" },
          "400": { "description": "Invalid input" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/data-sources/{id}": {
      "get": {
        "tags": ["Data Sources"],
        "summary": "Get a data source by ID",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "200": { "description": "Data source details" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Data source not found" }
        }
      },
      "put": {
        "tags": ["Data Sources"],
        "summary": "Update a data source",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "connectionDetails": { "type": "object" }
              }
            }
          }
        ],
        "responses": {
          "200": { "description": "Data source updated" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Data source not found" }
        }
      },
      "delete": {
        "tags": ["Data Sources"],
        "summary": "Delete a data source",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "204": { "description": "Data source deleted" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Data source not found" }
        }
      }
    },
    "/data-sources/{id}/test": {
      "post": {
        "tags": ["Data Sources"],
        "summary": "Test connection to a data source",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "200": { "description": "Connection successful" },
          "400": { "description": "Connection failed" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Data source not found" }
        }
      }
    },
    "/data-sources/{id}/execute-query": {
      "post": {
        "tags": ["Data Sources"],
        "summary": "Execute a SQL query against a data source",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["query"],
              "properties": {
                "query": { "type": "string", "description": "SQL query to execute" }
              }
            }
          }
        ],
        "responses": {
          "200": { "description": "Query results" },
          "400": { "description": "Invalid query or data source type" },
          "401": { "description": "Unauthorized" },
          "403": { "description": "Forbidden (e.g., DDL/DML operations)" },
          "404": { "description": "Data source not found" },
          "500": { "description": "Error executing query" }
        }
      }
    },
    "/charts": {
      "get": {
        "tags": ["Charts"],
        "summary": "Get all charts for the authenticated user",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of charts" },
          "401": { "description": "Unauthorized" }
        }
      },
      "post": {
        "tags": ["Charts"],
        "summary": "Create a new chart",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name", "type", "configuration"],
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "type": { "type": "string", "enum": ["BAR", "LINE", "PIE", "TABLE"] },
                "dataSourceId": { "type": "string", "format": "uuid" },
                "query": { "type": "string" },
                "configuration": { "type": "object", "description": "JSON object for ECharts options" }
              }
            }
          }
        ],
        "responses": {
          "201": { "description": "Chart created" },
          "400": { "description": "Invalid input" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/charts/{id}": {
      "get": {
        "tags": ["Charts"],
        "summary": "Get a chart by ID",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "200": { "description": "Chart details" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Chart not found" }
        }
      },
      "put": {
        "tags": ["Charts"],
        "summary": "Update a chart",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "type": { "type": "string", "enum": ["BAR", "LINE", "PIE", "TABLE"] },
                "dataSourceId": { "type": "string", "format": "uuid" },
                "query": { "type": "string" },
                "configuration": { "type": "object" }
              }
            }
          }
        ],
        "responses": {
          "200": { "description": "Chart updated" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Chart not found" }
        }
      },
      "delete": {
        "tags": ["Charts"],
        "summary": "Delete a chart",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "204": { "description": "Chart deleted" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Chart not found" }
        }
      }
    },
    "/dashboards": {
      "get": {
        "tags": ["Dashboards"],
        "summary": "Get all dashboards for the authenticated user",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of dashboards" },
          "401": { "description": "Unauthorized" }
        }
      },
      "post": {
        "tags": ["Dashboards"],
        "summary": "Create a new dashboard",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "layout": { "type": "array", "items": { "type": "object" }, "description": "Layout configuration for charts" },
                "chartIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "description": "List of chart IDs to include" }
              }
            }
          }
        ],
        "responses": {
          "201": { "description": "Dashboard created" },
          "400": { "description": "Invalid input" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/dashboards/{id}": {
      "get": {
        "tags": ["Dashboards"],
        "summary": "Get a dashboard by ID",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "200": { "description": "Dashboard details" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Dashboard not found" }
        }
      },
      "put": {
        "tags": ["Dashboards"],
        "summary": "Update a dashboard",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "layout": { "type": "array", "items": { "type": "object" } },
                "chartIds": { "type": "array", "items": { "type": "string", "format": "uuid" } }
              }
            }
          }
        ],
        "responses": {
          "200": { "description": "Dashboard updated" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Dashboard not found" }
        }
      },
      "delete": {
        "tags": ["Dashboards"],
        "summary": "Delete a dashboard",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "type": "string", "format": "uuid" }
        ],
        "responses": {
          "204": { "description": "Dashboard deleted" },
          "401": { "description": "Unauthorized" },
          "404": { "description": "Dashboard not found" }
        }
      }
    }
  }
}