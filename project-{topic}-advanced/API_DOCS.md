```markdown
# SQLInsight Pro API Reference

This document provides a detailed overview of the SQLInsight Pro RESTful API endpoints.
The API is designed for managing users, registering databases, reporting slow queries, and retrieving optimization insights.

**Base URL:** `http://localhost:5000/api/v1`

**Authentication:** Most endpoints require a JWT `access_token` passed in the `Authorization` header as `Bearer <token>`.

---

## 1. Authentication Endpoints

### `POST /auth/register`
Registers a new user account.

*   **Description:** Allows new users to create an account. Admin users can also be created via this endpoint if `role` is specified, but typically this would be restricted to `USER` role.
*   **Rate Limited:** Yes (stricter limit via `authRateLimiter`).
*   **Request Body:**
    ```json
    {
      "email": "string",         // Required, valid email format
      "password": "string",      // Required, min 8 chars, incl. uppercase, lowercase, number, special char
      "role": "user" | "admin"   // Optional, defaults to "user"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "data": {
        "user": {
          "id": "uuid",
          "email": "string",
          "role": "user" | "admin"
        },
        "accessToken": "string",   // JWT for subsequent authenticated requests
        "refreshToken": "string"   // JWT for acquiring new access tokens (conceptual for now)
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation failed (e.g., invalid email, weak password).
    *   `409 Conflict`: User with this email already exists.

### `POST /auth/login`
Authenticates a user and provides JWT tokens.

*   **Description:** Allows existing users to log in and obtain `accessToken` and `refreshToken`.
*   **Rate Limited:** Yes (stricter limit via `authRateLimiter`).
*   **Request Body:**
    ```json
    {
      "email": "string",         // Required, valid email format
      "password": "string"       // Required
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Logged in successfully",
      "data": {
        "user": {
          "id": "uuid",
          "email": "string",
          "role": "user" | "admin"
        },
        "accessToken": "string",
        "refreshToken": "string"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation failed.
    *   `401 Unauthorized`: Invalid credentials.

### `POST /auth/logout` (Authenticated)
Logs out the current user.

*   **Description:** Invalidates the user's session. In a full implementation, this would involve blacklisting the `refreshToken`.
*   **Authentication:** Requires `Bearer <accessToken>`.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Logged out successfully."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.

### `GET /auth/me` (Authenticated)
Retrieves the profile of the authenticated user.

*   **Description:** Returns details of the user whose `accessToken` is provided.
*   **Authentication:** Requires `Bearer <accessToken>`.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "email": "string",
        "role": "user" | "admin",
        "createdAt": "ISO date string",
        "updatedAt": "ISO date string"
      }
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.

---

## 2. User Management Endpoints (Admin access for most)

### `GET /users` (Authenticated, Admin Only)
Retrieves a list of all registered users.

*   **Authentication:** Requires `Bearer <accessToken>` and `role: "admin"`.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "uuid",
          "email": "string",
          "role": "user" | "admin",
          "createdAt": "ISO date string"
        }
        // ... more users
      ]
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User does not have admin privileges.

### `GET /users/:id` (Authenticated)
Retrieves a single user by ID.

*   **Description:** An admin can retrieve any user. A regular user can only retrieve their own profile.
*   **Authentication:** Requires `Bearer <accessToken>`.
*   **Path Parameters:**
    *   `id`: `uuid` - The ID of the user.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid",
        "email": "string",
        "role": "user" | "admin",
        "createdAt": "ISO date string"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid user ID format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `403 Forbidden`: User is trying to access another user's profile without admin privileges.
    *   `404 Not Found`: User not found.

### `PUT /users/:id` (Authenticated, Admin or Self-Update)
Updates a user's information.

*   **Description:** An admin can update any user