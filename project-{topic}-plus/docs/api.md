```markdown
# Real-Time Chat Application - API Documentation

The backend API is built using FastAPI, which automatically generates interactive OpenAPI documentation (Swagger UI). You can access it at: `http://localhost:8000/docs` (when running locally).

This document provides a summary of the available endpoints and their purpose.

## Base URL

`http://localhost:8000/api/v1`

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header.
Example: `Authorization: Bearer <YOUR_ACCESS_TOKEN>`

### 1. Auth Endpoints

*   **`POST /auth/register`**
    *   **Description**: Register a new user.
    *   **Request Body**: `UserCreate` schema
        ```json
        {
          "username": "string",
          "email": "user@example.com",
          "password": "strongpassword",
          "full_name": "string (optional)"
        }
        ```
    *   **Response**: `UserPublic` schema (status `201 Created`)
    *   **Errors**: `400 Bad Request` (e.g., duplicate email/username)

*   **`POST /auth/token`**
    *   **Description**: Authenticate user and get an access token.
    *   **Request Body**: Form-urlencoded
        ```
        username=<your_username>&password=<your_password>
        ```
    *   **Response**: `Token` schema
        ```json
        {
          "access_token": "string",
          "token_type": "bearer"
        }
        ```
    *   **Errors**: `401 Unauthorized` (incorrect credentials), `400 Bad Request` (inactive user), `429 Too Many Requests` (rate limited)

### 2. User Endpoints

*   **`GET /users/me`**
    *   **Description**: Get details of the current authenticated user.
    *   **Authentication**: Required
    *   **Response**: `UserPublic` schema
    *   **Errors**: `401 Unauthorized`

*   **`PATCH /users/me`**
    *   **Description**: Update details of the current authenticated user.
    *   **Authentication**: Required
    *   **Request Body**: `UserUpdate` schema (fields are optional)
        ```json
        {
          "email": "new_email@example.com",
          "full_name": "New Full Name"
        }
        ```
    *   **Response**: `UserPublic` schema
    *   **Errors**: `401 Unauthorized`, `422 Unprocessable Entity` (validation errors)

*   **`GET /users/{user_id}`**
    *   **Description**: Get details of a specific user by ID.
    *   **Authentication**: Required
    *   **Path Parameters**: `user_id` (integer)
    *   **Response**: `UserPublic` schema
    *   **Errors**: `401 Unauthorized`, `404 Not Found`

*   **`GET /users/`**
    *   **Description**: Retrieve a list of users.
    *   **Authentication**: Required
    *   **Query Parameters**:
        *   `skip` (integer, default: 0)
        *   `limit` (integer, default: 100)
    *   **Response**: List of `UserPublic` schemas
    *   **Errors**: `401 Unauthorized`

### 3. Chat Room Endpoints

*   **`POST /rooms/`**
    *   **Description**: Create a new chat room. The authenticated user becomes the owner and a member.
    *   **Authentication**: Required
    *   **Request Body**: `ChatRoomCreate` schema
        ```json
        {
          "name": "string",
          "description": "string (optional)",
          "is_private": false
        }
        ```
    *   **Response**: `ChatRoomPublic` schema (status `201 Created`)
    *   **Errors**: `401 Unauthorized`, `400 Bad Request` (room name already exists)

*   **`GET /rooms/`**
    *   **Description**: Retrieve a list of public chat rooms.
    *   **Authentication**: Required
    *   **Query Parameters**:
        *   `skip` (integer, default: 0)
        *   `limit` (integer, default: 100)
    *   **Response**: List of `ChatRoomPublic` schemas
    *   **Errors**: `401 Unauthorized`

*   **`GET /rooms/{room_id}`**
    *   **Description**: Retrieve details of a specific chat room. Includes owner and member information. For private rooms, the current user must be the owner or a member.
    *   **Authentication**: Required
    *   **Path Parameters**: `room_id` (integer)
    *   **Response**: `ChatRoomPublic` schema
    *   **Errors**: `401 Unauthorized`, `403 Forbidden` (private room access), `404 Not Found`

*   **`PATCH /rooms/{room_id}`**
    *   **Description**: Update an existing chat room. Only the room owner can update it.
    *   **Authentication**: Required (Owner only)
    *   **Path Parameters**: `room_id` (integer)
    *   **Request Body**: `ChatRoomUpdate` schema (fields are optional)
        ```json
        {
          "description": "New description",
          "is_private": true
        }
        ```
    *   **Response**: `ChatRoomPublic` schema
    *   **Errors**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

*   **`DELETE /rooms/{room_id}`**
    *   **Description**: Delete a chat room. Only the room owner can delete it. If the owner is the only member, leaving will delete the room.
    *   **Authentication**: Required (Owner only)
    *   **Path Parameters**: `room_id` (integer)
    *   **Response**: Empty response (status `204 No Content`)
    *   **Errors**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

*   **`POST /rooms/{room_id}/join`**
    *   **Description**: Join a chat room. The current user becomes a member. Cannot join private rooms without specific invites (future feature).
    *   **Authentication**: Required
    *   **Path Parameters**: `room_id` (integer)
    *   **Response**: `ChatRoomPublic` schema
    *   **Errors**: `401 Unauthorized`, `400 Bad Request` (already a member), `403 Forbidden` (private room)

*   **`POST /rooms/{room_id}/leave`**
    *   **Description**: Leave a chat room. The current user is removed from members. Owner cannot leave their own room if they are the only member.
    *   **Authentication**: Required
    *   **Path Parameters**: `room_id` (integer)
    *   **Response**: Empty response (status `204 No Content`)
    *   **Errors**: `401 Unauthorized`, `400 Bad Request` (not a member, or owner attempting to leave only-member room), `404 Not Found`

### 4. Message Endpoints

*   **`POST /messages/{room_id}`**
    *   **Description**: Send a message to a specific chat room. The current user must be a member of the room. The message will be broadcast to all connected WebSocket clients in that room.
    *   **Authentication**: Required
    *   **Path Parameters**: `room_id` (integer)
    *   **Request Body**: `MessageCreate` schema
        ```json
        {
          "content": "string"
        }
        ```
    *   **Response**: `MessagePublic` schema (status `201 Created`)
    *   **Errors**: `401 Unauthorized`, `403 Forbidden` (not a member), `404 Not Found`

*   **`GET /messages/{room_id}`**
    *   **Description**: Retrieve message history for a specific chat room. The current user must be a member or owner of the room (if private).
    *   **Authentication**: Required
    *   **Path Parameters**: `room_id` (integer)
    *   **Query Parameters**:
        *   `skip` (integer, default: 0)
        *   `limit` (integer, default: 50)
    *   **Response**: List of `MessagePublic` schemas
    *   **Errors**: `401 Unauthorized`, `403 Forbidden` (private room access), `404 Not Found`

## WebSocket Endpoint

*   **`GET /ws`**
    *   **Description**: Establishes a WebSocket connection for real-time message