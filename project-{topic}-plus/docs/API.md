```markdown
# Real-time Chat Application API Documentation

This document describes the REST API endpoints and WebSocket events provided by the backend of the Real-time Chat Application.

**Base URL:** `/api` (for REST endpoints)
**Socket URL:** `/` (for WebSocket connections)

---

## Authentication

### 1. User Registration
*   **Endpoint:** `POST /api/auth/register`
*   **Description:** Registers a new user account.
*   **Request Body:**
    ```json
    {
      "username": "uniqueUsername",
      "email": "user@example.com",
      "password": "strongPassword123"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": "uuid",
        "username": "uniqueUsername",
        "email": "user@example.com",
        "createdAt": "timestamp"
      }
    }
    ```
*   **Error (400 Bad Request):** If username/email already exists or validation fails.

### 2. User Login
*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates a user and returns a JWT token.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "strongPassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "uuid",
        "username": "uniqueUsername",
        "email": "user@example.com"
      }
    }
    ```
*   **Error (401 Unauthorized):** Invalid credentials.

### 3. Logout
*   **Endpoint:** `POST /api/auth/logout`
*   **Description:** (Optional - client-side token removal) Invalidates the JWT token on the client-side. Server-side logout could involve blacklisting tokens but is not implemented in this example for simplicity.
*   **Authentication:** Required (Bearer Token)
*   **Response (200 OK):**
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

---

## Users (Requires Authentication)

*   **Authentication:** All endpoints in this section require a valid JWT token in the `Authorization` header (`Bearer <token>`).

### 1. Get Current User Profile
*   **Endpoint:** `GET /api/users/me`
*   **Description:** Retrieves the profile of the authenticated user.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "uniqueUsername",
      "email": "user@example.com",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```

### 2. Get User by ID
*   **Endpoint:** `GET /api/users/:id`
*   **Description:** Retrieves a user's profile by their ID.
*   **Response (200 OK):**
    ```json
    {
      "id": "uuid",
      "username": "anotherUser",
      "email": "another@example.com",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ```
*   **Error (404 Not Found):** If user does not exist.

### 3. Search Users
*   **Endpoint:** `GET /api/users/search`
*   **Description:** Searches for users by username or email.
*   **Query Parameters:**
    *   `q` (string, required): The search query.
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "uuid",
        "username": "matchingUser",
        "email": "matching@example.com"
      },
      ...
    ]
    ```

---

## Conversations (Requires Authentication)

*   **Authentication:** All endpoints in this section require a valid JWT token.

### 1. Get All Conversations for User
*   **Endpoint:** `GET /api/conversations`
*   **Description:** Retrieves all conversations the authenticated user is a part of.
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "conv-uuid-1",
        "name": "Group Chat A" (or null for direct message),
        "isGroup": true,
        "createdAt": "timestamp",
        "updatedAt": "timestamp",
        "lastMessage": {
            "id": "msg-uuid-1",
            "senderId": "user-uuid-1",
            "content": "Hey everyone!",
            "createdAt": "timestamp"
        },
        "participants": [
          { "id": "user-uuid-1", "username": "user1" },
          { "id": "user-uuid-2", "username": "user2" }
        ]
      },
      ...
    ]
    ```

### 2. Get Conversation by ID with Messages
*   **Endpoint:** `GET /api/conversations/:id`
*   **Description:** Retrieves a specific conversation and its messages.
*   **Response (200 OK):**
    ```json
    {
      "id": "conv-uuid-1",
      "name": "Group Chat A",
      "isGroup": true,
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "participants": [
        { "id": "user-uuid-1", "username": "user1" },
        { "id": "user-uuid-2", "username": "user2" }
      ],
      "messages": [
        {
          "id": "msg-uuid-1",
          "senderId": "user-uuid-1",
          "content": "Hello world",
          "createdAt": "timestamp",
          "sender": { "id": "user-uuid-1", "username": "user1" }
        },
        ...
      ]
    }
    ```
*   **Error (403 Forbidden):** If user is not a participant of the conversation.
*   **Error (404 Not Found):** If conversation does not exist.

### 3. Create Conversation
*   **Endpoint:** `POST /api/conversations`
*   **Description:** Creates a new direct message or group conversation.
*   **Request Body:**
    *   **Direct Message:**
        ```json
        {
          "participantIds": ["target-user-uuid"]
        }
        ```
    *   **Group Message:**
        ```json
        {
          "name": "My New Group",
          "participantIds": ["user-uuid-2", "user-uuid-3"]
        }
        ```
        (Note: the authenticated user's ID is automatically added as a participant)
*   **Response (201 Created):**
    ```json
    {
      "message": "Conversation created successfully",
      "conversation": {
        "id": "new-conv-uuid",
        "name": "My New Group",
        "isGroup": true,
        "createdAt": "timestamp",
        "participants": [...]
      }
    }
    ```
*   **Error (400 Bad Request):** Invalid participants or missing name for group.

---

## Messages (Requires Authentication)

*   **Authentication:** All endpoints in this section require a valid JWT token.

### 1. Send Message (REST - primarily for initial implementation, then WebSockets)
*   **Endpoint:** `POST /api/conversations/:conversationId/messages`
*   **Description:** Sends a new message to a specific conversation.
*   **Request Body:**
    ```json
    {
      "content": "This is my message content."
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "Message sent successfully",
      "message": {
        "id": "new-msg-uuid",
        "conversationId": "conv-uuid",
        "senderId": "user-uuid",
        "content": "This is my message content.",
        "createdAt": "timestamp"
      }
    }
    ```
*   **Error (403 Forbidden):** If user is not a participant of the conversation.
*   **Error (404 Not Found):** If conversation does not exist.

---

## WebSocket Events

The Socket.IO connection is authenticated using the JWT token passed either in the query string (`token=...`) or `auth` payload during connection.

### Client Emits (to Server)

*   `join_conversation`:
    *   **Payload:** `{ conversationId: string }`
    *   **Description:** Client joins a specific conversation room to receive messages.
*   `leave_conversation`:
    *   **Payload:** `{ conversationId: string }`
    *   **Description:** Client leaves a conversation room.
*   `send_message`:
    *   **Payload:** `{ conversationId: string, content: string }`
    *   **Description:** Client sends a new message to a conversation.
*   `typing_start`:
    *   **Payload:** `{ conversationId: string }`
    *   **Description:** Client indicates they are typing in a conversation.
*   `typing_stop`:
    *   **Payload:** `{ conversationId: string }`
    *   **Description:** Client indicates they stopped typing.

### Server Emits (to Client)

*   `receive_message`:
    *   **Payload:** `{ id: string, conversationId: string, senderId: string, sender: { id: string, username: string }, content: string, createdAt: string }`
    *   **Description:** A new message has been sent to a conversation the client is in.
*   `user_joined`:
    *   **Payload:** `{ userId: string, username: string }`
    *   **Description:** A user has connected to the chat.
*   `user_left`:
    *   **Payload:** `{ userId: string }`
    *   **Description:** A user has disconnected from the chat.
*   `user_online`:
    *   **Payload:** `{ userId: string }`
    *   **Description:** A user has come online.
*   `user_offline`:
    *   **Payload:** `{ userId: string }`
    *   **Description:** A user has gone offline.
*   `typing_started`:
    *   **Payload:** `{ conversationId: string, userId: string, username: string }`
    *   **Description:** Another user in the conversation has started typing.
*   `typing_stopped`:
    *   **Payload:** `{ conversationId: string, userId: string }`
    *   **Description:** Another user in the conversation has stopped typing.
*   `error`:
    *   **Payload:** `{ message: string }`
    *   **Description:** An error occurred on the server related to a WebSocket event.

---
```