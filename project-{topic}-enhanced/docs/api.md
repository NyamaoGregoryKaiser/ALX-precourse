```markdown
# Real-time Chat Application - API Documentation

This document describes the RESTful API endpoints and WebSocket events for the Real-time Chat Application.

**Base URL:** `http://localhost:5000/api` (for local development)
**WebSocket URL:** `http://localhost:5000` (for local development)

## Authentication

All API endpoints, except `/api/auth/register` and `/api/auth/login`, require authentication.
Authentication is performed using JSON Web Tokens (JWT). The token must be sent in the `Authorization` header as a Bearer token: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

### 1. Auth Endpoints

#### `POST /api/auth/register`

Registers a new user.

*   **Request Body:**
    ```json
    {
        "username": "string",
        "email": "string (email format)",
        "password": "string (min 6 characters)"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
        "status": "success",
        "message": "User registered successfully",
        "data": {
            "user": {
                "id": "string (UUID)",
                "username": "string",
                "email": "string"
            },
            "token": "string (JWT)"
        }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error (e.g., invalid email, short password, existing username/email).

#### `POST /api/auth/login`

Logs in an existing user.

*   **Request Body:**
    ```json
    {
        "email": "string (email format)",
        "password": "string"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "message": "Logged in successfully",
        "data": {
            "user": {
                "id": "string (UUID)",
                "username": "string",
                "email": "string"
            },
            "token": "string (JWT)"
        }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error.
    *   `401 Unauthorized`: Invalid credentials.

#### `POST /api/auth/logout`

Logs out the authenticated user. Invalidates the JWT token server-side (optional: can be implemented to blacklist or remove from cache).

*   **Authentication:** Required
*   **Request Body:** None
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "message": "Logged out successfully"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: If token is missing or invalid.

### 2. User Endpoints

All user endpoints require authentication.

#### `GET /api/users/me`

Retrieves the profile of the authenticated user.

*   **Authentication:** Required
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "user": {
                "id": "string (UUID)",
                "username": "string",
                "email": "string",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)"
            }
        }
    }
    ```

#### `PATCH /api/users/me`

Updates the profile of the authenticated user.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
        "username": "string (optional)",
        "email": "string (email format, optional)"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "message": "Profile updated successfully",
        "data": {
            "user": {
                "id": "string (UUID)",
                "username": "string",
                "email": "string",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)"
            }
        }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error.
    *   `409 Conflict`: If username or email already exists.

#### `GET /api/users/:id`

Retrieves the profile of a user by ID.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: The UUID of the user.
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "user": {
                "id": "string (UUID)",
                "username": "string",
                "email": "string",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)"
            }
        }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: User not found.

#### `GET /api/users`

Retrieves a list of all registered users.

*   **Authentication:** Required
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "users": [
                {
                    "id": "string (UUID)",
                    "username": "string",
                    "email": "string",
                    "createdAt": "string (ISO Date)",
                    "updatedAt": "string (ISO Date)"
                }
                // ... more users
            ]
        }
    }
    ```

### 3. Chat Endpoints

All chat endpoints require authentication.

#### `POST /api/chats`

Creates a new chat room. The authenticated user is automatically added as a participant.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
        "name": "string (min 3 characters)",
        "description": "string (optional, max 255 characters)"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
        "status": "success",
        "data": {
            "chatRoom": {
                "id": "string (UUID)",
                "name": "string",
                "description": "string | null",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)",
                "participants": [
                  {
                    "userId": "string (UUID)",
                    "chatRoomId": "string (UUID)",
                    "user": { "id": "string", "username": "string", "email": "string" }
                  }
                ]
            }
        }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error.

#### `GET /api/chats`

Retrieves a list of all chat rooms the authenticated user is a participant of. Includes the last message for each room.

*   **Authentication:** Required
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "chatRooms": [
                {
                    "id": "string (UUID)",
                    "name": "string",
                    "description": "string | null",
                    "createdAt": "string (ISO Date)",
                    "updatedAt": "string (ISO Date)",
                    "participants": [
                        {
                            "userId": "string",
                            "chatRoomId": "string",
                            "user": { "id": "string", "username": "string", "email": "string" }
                        }
                    ],
                    "messages": [ // Contains only the latest message for preview
                        {
                            "id": "string",
                            "content": "string",
                            "senderId": "string",
                            "sender": { "id": "string", "username": "string" },
                            "chatRoomId": "string",
                            "createdAt": "string (ISO Date)"
                        }
                    ]
                }
                // ... more chat rooms
            ]
        }
    }
    ```

#### `GET /api/chats/:id`

Retrieves details of a specific chat room, including its participants.

*   **Authentication:** Required
*   **Path Parameters:**
    *   `id`: The UUID of the chat room.
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "chatRoom": {
                "id": "string (UUID)",
                "name": "string",
                "description": "string | null",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)",
                "participants": [
                    {
                        "userId": "string",
                        "chatRoomId": "string",
                        "user": { "id": "string", "username": "string", "email": "string" }
                    }
                ],
                "messages": [ // Array of messages (initial 50 by default)
                    {
                        "id": "string",
                        "content": "string",
                        "senderId": "string",
                        "chatRoomId": "string",
                        "createdAt": "string (ISO Date)",
                        "sender": { "id": "string", "username": "string", "email": "string" }
                    }
                ]
            }
        }
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Chat room not found.

#### `POST /api/chats/join`

Adds the authenticated user as a participant to an existing chat room.

*   **Authentication:** Required
*   **Request Body:**
    ```json
    {
        "chatRoomId": "string (UUID)"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "message": "Joined chat room successfully",
        "data": {
            "chatRoom": {
                "id": "string (UUID)",
                "name": "string",
                "description": "string | null",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)",
                "participants": [
                  {
                    "userId": "string",
                    "chatRoomId": "string",
                    "user": { "id": "string", "username": "string", "email": "string" }
                  }
                ]
            }
        }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error.
    *   `404 Not Found`: Chat room not found.

#### `GET /api/chats/:id/messages`

Retrieves message history for a specific chat room.

*   **Authentication:** Required (User must be a participant of the room)
*   **Path Parameters:**
    *   `id`: The UUID of the chat room.
*   **Query Parameters:**
    *   `limit`: `number` (optional, default 50). Maximum number of messages to return.
    *   `offset`: `number` (optional, default 0). Number of messages to skip (for pagination).
*   **Response (200 OK):**
    ```json
    {
        "status": "success",
        "data": {
            "messages": [
                {
                    "id": "string (UUID)",
                    "content": "string",
                    "createdAt": "string (ISO Date)",
                    "updatedAt": "string (ISO Date)",
                    "senderId": "string (UUID)",
                    "chatRoomId": "string (UUID)",
                    "sender": {
                        "id": "string",
                        "username": "string",
                        "email": "string"
                    }
                }
                // ... more messages, ordered from oldest to newest
            ]
        }
    }
    ```
*   **Error Responses:**
    *   `403 Forbidden`: User is not a participant of the chat room.
    *   `404 Not Found`: Chat room not found.

#### `POST /api/chats/:id/messages`

Sends a message to a specific chat room. This endpoint primarily persists the message. Real-time broadcast is handled via WebSocket.

*   **Authentication:** Required (User must be a participant of the room)
*   **Path Parameters:**
    *   `id`: The UUID of the chat room.
*   **Request Body:**
    ```json
    {
        "content": "string (min 1 character, max 1000 characters)"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
        "status": "success",
        "message": "Message sent and saved",
        "data": {
            "message": {
                "id": "string (UUID)",
                "content": "string",
                "createdAt": "string (ISO Date)",
                "updatedAt": "string (ISO Date)",
                "senderId": "string (UUID)",
                "chatRoomId": "string (UUID)",
                "sender": {
                    "id": "string",
                    "username": "string",
                    "email": "string"
                }
            }
        }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Validation error.
    *   `403 Forbidden`: User is not a participant of the chat room.

## WebSocket Events

WebSocket connections are established at `ws://localhost:5000` (or `wss://your-domain.com`).
The client must send the JWT token in the `auth` object during connection:
`io(WS_URL, { auth: { token: 'YOUR_JWT_TOKEN' } });`

### Client Emits (Outgoing Events)

#### `joinRoom`

Informs the server that the client wants to join a specific chat room.

*   **Payload:** `string` (chatRoomId)
*   **Callback:** `(status: 'success' | 'error', message?: string) => void`
*   **Example:**
    ```javascript
    socket.emit('joinRoom', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', (status, message) => {
      if (status === 'success') console.log('Joined room!');
      else console.error('Failed to join:', message);
    });
    ```

#### `leaveRoom`

Informs the server that the client is leaving a chat room.

*   **Payload:** `string` (chatRoomId)
*   **Callback:** `(status: 'success' | 'error', message?: string) => void`
*   **Example:**
    ```javascript
    socket.emit('leaveRoom', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    ```

#### `chatMessage`

Sends a new message to a chat room.

*   **Payload:**
    ```typescript
    interface SocketMessage {
        chatRoomId: string;
        senderId: string;
        content: string;
    }
    ```
*   **Callback:** `(status: 'success' | 'error', data?: any) => void`
*   **Example:**
    ```javascript
    socket.emit('chatMessage', {
        chatRoomId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        senderId: 'user-uuid-1',
        content: 'Hello everyone!'
    }, (status, response) => {
        if (status === 'success') console.log('Message sent:', response);
        else console.error('Message failed:', response);
    });
    ```

#### `typing`

Informs other users in a room that the current user is typing.

*   **Payload:** `string` (chatRoomId)
*   **Example:**
    ```javascript
    socket.emit('typing', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    ```

#### `stopTyping`

Informs other users in a room that the current user has stopped typing.

*   **Payload:** `string` (chatRoomId)
*   **Example:**
    ```javascript
    socket.emit('stopTyping', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    ```

### Server Emits (Incoming Events)

#### `message`

Broadcasted to all clients in a chat room when a new message is sent.

*   **Payload:**
    ```typescript
    interface Message {
        id: string;
        chatRoomId: string;
        senderId: string;
        senderUsername: string; // Included for display
        content: string;
        createdAt: string; // ISO string
    }
    ```
*   **Example (Client-side listener):**
    ```javascript
    socket.on('message', (msg) => {
        console.log(`New message in ${msg.chatRoomId} from ${msg.senderUsername}: ${msg.content}`);
    });
    ```

#### `userJoined`

Broadcasted to all clients in a chat room when a new user joins.

*   **Payload:**
    ```typescript
    interface SocketJoinRoomEvent {
        userId: string;
        username: string;
        chatRoomId: string;
    }
    ```
*   **Example:**
    ```javascript
    socket.on('userJoined', ({ username }) => {
        console.log(`${username} has joined the chat.`);
    });
    ```

#### `userLeft`

Broadcasted to all clients in a chat room when a user leaves.

*   **Payload:** (Same as `userJoined`)
*   **Example:**
    ```javascript
    socket.on('userLeft', ({ username }) => {
        console.log(`${username} has left the chat.`);
    });
    ```

#### `typing`

Broadcasted to all clients in a chat room when a user starts typing.

*   **Payload:** (Same as `userJoined`)
*   **Example:**
    ```javascript
    socket.on('typing', ({ username }) => {
        console.log(`${username} is typing...`);
    });
    ```

#### `stopTyping`

Broadcasted to all clients in a chat room when a user stops typing.

*   **Payload:** (Same as `userJoined`)
*   **Example:**
    ```javascript
    socket.on('stopTyping', ({ username }) => {
        console.log(`${username} stopped typing.`);
    });
    ```
```