# API Documentation - Secure Auth System

This document outlines the RESTful API endpoints for the Secure Auth System.
For an interactive Swagger UI, deploy the application and visit `http://localhost:8080/swagger-ui.html`.

## Base URL

`http://localhost:8080/api`

## Response Structure

All API responses (success and error) follow a consistent JSON structure:

```json
// Success Response
{
  "status": 200,
  "message": "Operation successful",
  "errorCode": null,
  "path": "/api/resource",
  "timestamp": "2023-10-27T10:30:00.123",
  "data": {
    // Actual response data
  },
  "errors": null
}

// Error Response
{
  "status": 400,
  "message": "Validation failed",
  "errorCode": "validation_error",
  "path": "/api/auth/register",
  "timestamp": "2023-10-27T10:35:00.456",
  "data": null,
  "errors": {
    "fieldName": "Validation error message"
  }
}
```

## Authentication

All secured endpoints require a JSON Web Token (JWT) to be passed in the `Authorization` header as a Bearer token: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

### 1. Auth Endpoints

#### 1.1. Register User

*   **Endpoint:** `POST /api/auth/register`
*   **Description:** Registers a new user account with default `ROLE_USER`.
*   **Authentication:** None (public endpoint)
*   **Rate Limited:** Yes (per IP)

**Request Body:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "StrongPassword1!"
}
```

**Request Body Fields:**

| Field      | Type   | Required | Constraints                                                                           |
| :--------- | :----- | :------- | :------------------------------------------------------------------------------------ |
| `username` | String | Yes      | Min 3, Max 50 characters, unique.                                                     |
| `email`    | String | Yes      | Valid email format, Max 100 characters, unique.                                       |
| `password` | String | Yes      | Min 8 characters, must contain at least one digit, one lowercase, one uppercase, and one special character. |

**Success Response (HTTP 201 Created):**

```json
{
  "status": 201,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "path": "/api/auth/register",
  "timestamp": "2023-10-27T11:00:00.000"
}
```

**Error Responses:**

*   **HTTP 400 Bad Request:**
    *   `username_taken`: Username already exists.
    *   `email_taken`: Email already exists.
    *   `method_argument_not_valid`: Invalid input (e.g., password not meeting complexity).
*   **HTTP 429 Too Many Requests:** `rate_limit_exceeded`

#### 1.2. Login User

*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates a user and returns a JWT token.
*   **Authentication:** None (public endpoint)
*   **Rate Limited:** Yes (per IP)

**Request Body:**

```json
{
  "username": "admin",
  "password": "password123!A"
}
```

**Request Body Fields:**

| Field      | Type   | Required | Constraints               |
| :--------- | :----- | :------- | :------------------------ |
| `username` | String | Yes      | Username or email of the user. |
| `password` | String | Yes      | User's password.          |

**Success Response (HTTP 200 OK):**

```json
{
  "status": 200,
  "message": "Login successful. Welcome back!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "path": "/api/auth/login",
  "timestamp": "2023-10-27T11:05:00.000"
}
```

**Error Responses:**

*   **HTTP 401 Unauthorized:**
    *   `bad_credentials`: Invalid username or password.
    *   `account_disabled`: User account is disabled.
    *   `account_locked`: User account is locked.
*   **HTTP 429 Too Many Requests:** `rate_limit_exceeded`

---

### 2. User Endpoints

These endpoints manage user accounts. Access is restricted by roles and ownership.

#### 2.1. Get All Users

*   **Endpoint:** `GET /api/users`
*   **Description:** Retrieves a paginated list of all users.
*   **Authentication:** Required (`ROLE_ADMIN`)

**Query Parameters:**

| Parameter | Type   | Default | Description                                                     |
| :-------- | :----- | :------ | :-------------------------------------------------------------- |
| `page`    | Integer | `0`     | Page number (0-indexed).                                        |
| `size`    | Integer | `20`    | Number of items per page.                                       |
| `sort`    | String | `username,asc` | Sort order (e.g., `username,desc`).                             |

**Success Response (HTTP 200 OK):**

```json
{
  "status": 200,
  "message": "Users retrieved successfully",
  "data": {
    "content": [
      {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "enabled": true,
        "roles": ["ROLE_ADMIN", "ROLE_USER"],
        "createdAt": "2023-10-27T08:00:00.000",
        "updatedAt": "2023-10-27T08:00:00.000"
      },
      {
        "id": 2,
        "username": "testuser",
        "email": "testuser@example.com",
        "enabled": true,
        "roles": ["ROLE_USER"],
        "createdAt": "2023-10-27T08:05:00.000",
        "updatedAt": "2023-10-27T08:05:00.000"
      }
    ],
    "pageable": { /* ... */ },
    "last": true,
    "totalElements": 2,
    "totalPages": 1,
    "size": 20,
    "number": 0,
    "first": true,
    "numberOfElements": 2,
    "empty": false
  },
  "path": "/api/users",
  "timestamp": "2023-10-27T11:10:00.000"
}
```

**Error Responses:**

*   **HTTP 401 Unauthorized:** Invalid or missing JWT.
*   **HTTP 403 Forbidden:** Authenticated user does not have `ROLE_ADMIN`.

#### 2.2. Get User By ID

*   **Endpoint:** `GET /api/users/{id}`
*   **Description:** Retrieves a user's details by their ID.
*   **Authentication:** Required (`ROLE_ADMIN` OR owner of the resource)

**Path Parameters:**

| Parameter | Type   | Description             |
| :-------- | :----- | :---------------------- |
| `id`      | Long   | The ID of the user.     |

**Success Response (HTTP 200 OK):**

```json
{
  "status": 200,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "enabled": true,
    "roles": ["ROLE_ADMIN", "ROLE_USER"],
    "createdAt": "2023-10-27T08:00:00.000",
    "updatedAt": "2023-10-27T08:00:00.000"
  },
  "path": "/api/users/1",
  "timestamp": "2023-10-27T11:15:00.000"
}
```

**Error Responses:**

*   **HTTP 401 Unauthorized:** Invalid or missing JWT.
*   **HTTP 403 Forbidden:** Authenticated user is neither `ROLE_ADMIN` nor the owner of the requested user.
*   **HTTP 404 Not Found:** `resource_not_found`: User with the specified ID does not exist.

#### 2.3. Create New User

*   **Endpoint:** `POST /api/users`
*   **Description:** Creates a new user account with specified roles.
*   **Authentication:** Required (`ROLE_ADMIN`)

**Request Body:**

```json
{
  "username": "manageruser",
  "email": "manager@example.com",
  "password": "ManagerPass1!",
  "enabled": true,
  "accountNonExpired": true,
  "accountNonLocked": true,
  "credentialsNonExpired": true,
  "roleNames": ["ROLE_USER", "ROLE_MANAGER"]
}
```

**Request Body Fields:**

| Field                 | Type      | Required | Constraints                                                                           |
| :-------------------- | :-------- | :------- | :------------------------------------------------------------------------------------ |
| `username`            | String    | Yes      | Min 3, Max 50 characters, unique.                                                     |
| `email`               | String    | Yes      | Valid email format, Max 100 characters, unique.                                       |
| `password`            | String    | Yes      | Min 8 characters, must contain at least one digit, one lowercase, one uppercase, and one special character. |
| `enabled`             | Boolean   | No       | Default: `true`.                                                                      |
| `accountNonExpired`   | Boolean   | No       | Default: `true`.                                                                      |
| `accountNonLocked`    | Boolean   | No       | Default: `true`.                                                                      |
| `credentialsNonExpired` | Boolean   | No       | Default: `true`.                                                                      |
| `roleNames`           | Set<String> | No       | Names of roles to assign (e.g., `["ROLE_USER"]`). Roles must exist.                  |

**Success Response (HTTP 201 Created):**

```json
{
  "status": 201,
  "message": "User created successfully",
  "data": {
    "id": 3,
    "username": "manageruser",
    "email": "manager@example.com",
    "enabled": true,
    "roles": ["ROLE_USER", "ROLE_MANAGER"],
    "createdAt": "2023-10-27T11:20:00.000",
    "updatedAt": "2023-10-27T11:20:00.000"
  },
  "path": "/api/users",
  "timestamp": "2023-10-27T11:20:00.000"
}
```

**Error Responses:**

*   **HTTP 401 Unauthorized:** Invalid or missing JWT.
*   **HTTP 403 Forbidden:** Authenticated user does not have `ROLE_ADMIN`.
*   **HTTP 400 Bad Request:**
    *   `username_taken`: Username already exists.
    *   `email_taken`: Email already exists.
    *   `method_argument_not_valid`: Invalid input.
*   **HTTP 404 Not Found:** `role_not_found`: One or more specified roles do not exist.

#### 2.4. Update User By ID

*   **Endpoint:** `PUT /api/users/{id}`
*   **Description:** Updates an existing user's details. Supports partial updates (PATCH-like behavior for omitted fields).
*   **Authentication:** Required (`ROLE_ADMIN` OR owner of the resource)

**Path Parameters:**

| Parameter | Type   | Description             |
| :-------- | :----- | :---------------------- |
| `id`      | Long   | The ID of the user to update. |

**Request Body:**

```json
{
  "email": "updated_manager@example.com",
  "enabled": false,
  "roleNames": ["ROLE_USER"]
  // password can also be updated here, but typically handled separately
}
```

**Request Body Fields:** (All fields are optional, only provided fields will be updated)

| Field                 | Type      | Required | Constraints                                                                           |
| :-------------------- | :-------- | :------- | :------------------------------------------------------------------------------------ |
| `username`            | String    | No       | Min 3, Max 50 characters, unique.                                                     |
| `email`               | String    | No       | Valid email format, Max 100 characters, unique.                                       |
| `password`            | String    | No       | Min 8 characters, must contain at least one digit, one lowercase, one uppercase, and one special character. |
| `enabled`             | Boolean   | No       |                                                                                       |
| `accountNonExpired`   | Boolean   | No       |                                                                                       |
| `accountNonLocked`    | Boolean   | No       |                                                                                       |
| `credentialsNonExpired` | Boolean   | No       |                                                                                       |
| `roleNames`           | Set<String> | No       | New set of role names to assign. Existing roles not in this set will be removed.        |

**Success Response (HTTP 200 OK):**

```json
{
  "status": 200,
  "message": "User updated successfully",
  "data": {
    "id": 3,
    "username": "manageruser",
    "email": "updated_manager@example.com",
    "enabled": false,
    "roles": ["ROLE_USER"],
    "createdAt": "2023-10-27T