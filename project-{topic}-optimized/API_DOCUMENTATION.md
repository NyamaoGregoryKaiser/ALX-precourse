```markdown
# ALX Chat Application API Documentation

This document outlines the RESTful API endpoints for the ALX Chat Application.

**Base URL**: `http://localhost:8080/api/v1`

**Authentication**: All endpoints (except `/api/v1/auth/**` and `/ws/chat`) require a JWT token in the `Authorization` header: `Authorization: Bearer <YOUR_JWT_TOKEN>`.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Register User

*   **Endpoint**: `POST /api/v1/auth/register`
*   **Description**: Registers a new user.
*   **Request Body**: `application/json`
    ```json
    {
      "username": "newuser",
      "email": "newuser@example.com",
      "password": "securepassword123",
      "roles": ["user"]
    }
    ```
*   **Success Response**: `HTTP 201 Created`
    ```
    User registered successfully!
    ```
*   **Error Responses**:
    *   `HTTP 400 Bad Request` (e.g., username/email already taken, invalid input)
        ```json
        {
          "timestamp": "2023-10-27T10:30:00",
          "status": 400,
          "message": "Username is already taken!",
          "path": "/api/v1/auth/register"
        }
        ```

### 1.2 Login User

*   **Endpoint**: `POST /api/v1/auth/login`
*   **Description**: Authenticates a user and returns a JWT token.
*   **Request Body**: `application/json`
    ```json
    {
      "usernameOrEmail": "newuser",
      "password": "securepassword123"
    }
    ```
*   **Success Response**: `HTTP 200 OK`
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "type": "Bearer",
      "id": 1,
      "username": "newuser",
      "email": "newuser@example.com",
      "roles": ["ROLE_USER"]
    }
    ```
*   **Error Responses**:
    *   `HTTP 401 Unauthorized` (e.g., invalid credentials)
        ```json
        {
          "status": 401,
          "error": "Unauthorized",
          "message": "Bad credentials",
          "path": "/api/v1/auth/login"
        }
        ```

---

## 2. User Endpoints (`/api/v1/users`)

*   **Authorization**: `ROLE_USER` can access/update their own profile. `ROLE_ADMIN` has full access.

### 2.1 Get User by ID

*   **Endpoint**: `GET /api/v1/users/{id}`
*   **Description**: Retrieve user details by ID.
*   **Path Variable**: `id` (User ID)
*   **Success Response**: `HTTP 200 OK`
    ```json
    {
      "id": 1,
      "username": "newuser",
      "email": "newuser@example.com",
      "createdAt": "2023-10-27T10:35:00",
      "lastLogin": "2023-10-27T10:40:00",
      "roles": ["ROLE_USER"]
    }
    ```
*   **Error Responses**:
    *   `HTTP 404 Not Found` (User not found)
    *   `HTTP 403 Forbidden` (Not authorized to view this user)

### 2.2 Get User by Username

*   **Endpoint**: `GET /api/v1/users/username/{username}`
*   **Description**: Retrieve user details by username.
*   **Path Variable**: `username`
*   **Success Response**: `HTTP 200 OK` (Same as Get User by ID)
*   **Error Responses**:
    *   `HTTP 404 Not Found` (User not found)
    *   `HTTP 403 Forbidden` (Not authorized to view this user)

### 2.3 Get All Users

*   **Endpoint**: `GET /api/v1/users`
*   **Description**: Retrieve a list of all users.
*   **Authorization**: `ROLE_ADMIN` only.
*   **Success Response**: `HTTP 200 OK`
    ```json
    [
      {
        "id": 1,
        "username": "newuser",
        "email": "newuser@example.com",
        "createdAt": "2023-10-27T10:35:00",
        "lastLogin": "2023-10-27T10:40:00",
        "roles": ["ROLE_USER"]
      },
      {
        "id": 2,
        "username": "adminuser",
        "email": "admin@example.com",
        "createdAt": "2023-10-27T10:30:00",
        "lastLogin": "2023-10-27T10:38:00",
        "roles": ["ROLE_ADMIN", "ROLE_USER"]
      }
    ]
    ```
*   **Error Responses**:
    *   `HTTP 403 Forbidden` (Not an admin)

### 2.4 Update User

*   **Endpoint**: `PUT /api/v1/users/{id}`
*   **Description**: Update user details.
*   **Authorization**: User can update their own profile; `ROLE_ADMIN` can update any user.
*   **Path Variable**: `id` (User ID)
*   **Request Body**: `application/json`
    ```json
    {
      "username": "updatedusername",
      "email": "updated@example.com"
      // Password and roles are typically updated via separate, more secure endpoints.
    }
    ```
*   **Success Response**: `HTTP 200 OK` (Returns updated UserDTO)
*   **Error Responses**:
    *   `HTTP 404 Not Found` (User not found)
    *   `HTTP 403 Forbidden` (Not authorized to update this user)
    *   `HTTP 400 Bad Request` (Validation errors)

### 2.5 Delete User

*   **Endpoint**: `DELETE /api/v1/users/{id}`
*   **Description**: Delete a user.
*   **Authorization**: `ROLE_ADMIN` only.
*   **Path Variable**: `id` (User ID)
*   **Success Response**: `HTTP 204 No Content`
*   **Error Responses**:
    *   `HTTP 404 Not Found` (User not found)
    *   `HTTP 403 Forbidden` (Not an admin)

---

## 3. Chat Room Endpoints (`/api/v1/rooms`)

*   **Authorization**: `ROLE_USER` can create/view rooms. Creator/Admin can update/delete rooms and manage members.

### 3.1 Create Chat Room

*   **Endpoint**: `POST /api/v1/rooms`
*   **Description**: Creates a new chat room. The authenticated user becomes the creator and a member.
*   **Request Body**: `application/json`
    ```json
    {
      "name": "My New Public Room",
      "type": "PUBLIC" // or "PRIVATE", "DIRECT_MESSAGE"
    }
    ```
*   **Success Response**: `HTTP 201 Created`
    ```json
    {
      "id": 101,
      "name": "My New Public Room",
      "type": "PUBLIC",
      "creator": { "id": 1, "username": "user1" },
      "createdAt": "2023-10-27T10:45:00",
      "memberCount": 1
    }
    ```
*   **Error Responses**:
    *   `HTTP 400 Bad Request` (Room name already exists, invalid input)

### 3.2 Get Chat Room by ID

*   **Endpoint**: `GET /api/v1/rooms/{id}`
*   **Description**: Retrieve chat room details by ID.
*   **Path Variable**: `id` (Chat Room ID)
*   **Success Response**: `HTTP 200 OK` (Returns ChatRoomDTO)
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room not found)

### 3.3 Get All Chat Rooms

*   **Endpoint**: `GET /api/v1/rooms`
*   **Description**: Retrieve a list of all chat rooms.
*   **Success Response**: `HTTP 200 OK` (List of ChatRoomDTOs)

### 3.4 Get Chat Rooms for a User

*   **Endpoint**: `GET /api/v1/rooms/user/{userId}`
*   **Description**: Retrieve a list of chat rooms a specific user is a member of.
*   **Authorization**: User can view their own rooms; `ROLE_ADMIN` can view any user's rooms.
*   **Path Variable**: `userId`
*   **Success Response**: `HTTP 200 OK` (List of ChatRoomDTOs)
*   **Error Responses**:
    *   `HTTP 404 Not Found` (User not found)
    *   `HTTP 403 Forbidden` (Not authorized)

### 3.5 Update Chat Room

*   **Endpoint**: `PUT /api/v1/rooms/{id}`
*   **Description**: Update chat room details.
*   **Authorization**: `ROLE_ADMIN` or the room creator.
*   **Path Variable**: `id` (Chat Room ID)
*   **Request Body**: `application/json`
    ```json
    {
      "name": "Updated Room Name",
      "type": "PRIVATE"
    }
    ```
*   **Success Response**: `HTTP 200 OK` (Returns updated ChatRoomDTO)
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room not found)
    *   `HTTP 403 Forbidden` (Not authorized)
    *   `HTTP 400 Bad Request` (Name already exists, invalid input)

### 3.6 Delete Chat Room

*   **Endpoint**: `DELETE /api/v1/rooms/{id}`
*   **Description**: Delete a chat room.
*   **Authorization**: `ROLE_ADMIN` or the room creator.
*   **Path Variable**: `id` (Chat Room ID)
*   **Success Response**: `HTTP 204 No Content`
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room not found)
    *   `HTTP 403 Forbidden` (Not authorized)

### 3.7 Add Member to Chat Room

*   **Endpoint**: `POST /api/v1/rooms/{roomId}/members/{userId}`
*   **Description**: Adds a user to a specific chat room.
*   **Authorization**: `ROLE_ADMIN` or the room creator.
*   **Path Variables**: `roomId`, `userId`
*   **Success Response**: `HTTP 200 OK`
    ```
    User added to chat room successfully.
    ```
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room or User not found)
    *   `HTTP 403 Forbidden` (Not authorized)
    *   `HTTP 400 Bad Request` (User already a member)

### 3.8 Remove Member from Chat Room

*   **Endpoint**: `DELETE /api/v1/rooms/{roomId}/members/{userId}`
*   **Description**: Removes a user from a specific chat room.
*   **Authorization**: `ROLE_ADMIN`, the room creator, or the user themselves (to leave the room).
*   **Path Variables**: `roomId`, `userId`
*   **Success Response**: `HTTP 200 OK`
    ```
    User removed from chat room successfully.
    ```
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room or User not found, or user not a member)
    *   `HTTP 403 Forbidden` (Not authorized)

### 3.9 Get Room Members

*   **Endpoint**: `GET /api/v1/rooms/{roomId}/members`
*   **Description**: Retrieve a list of all members in a chat room.
*   **Authorization**: Any authenticated user can view members.
*   **Path Variable**: `roomId`
*   **Success Response**: `HTTP 200 OK`
    ```json
    [
      {
        "id": 1,
        "username": "user1",
        "email": "user1@example.com",
        "roles": ["ROLE_USER"]
      },
      {
        "id": 2,
        "username": "user2",
        "email": "user2@example.com",
        "roles": ["ROLE_USER"]
      }
    ]
    ```
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room not found)

---

## 4. Message Endpoints (`/api/v1/messages`)

*   **Authorization**: Any authenticated user can access messages in rooms they are members of.

### 4.1 Get Messages by Room ID

*   **Endpoint**: `GET /api/v1/messages/room/{roomId}`
*   **Description**: Retrieve paginated message history for a specific chat room.
*   **Path Variable**: `roomId`
*   **Query Parameters**:
    *   `page` (optional, default 0): Page number.
    *   `size` (optional, default 50): Number of messages per page.
*   **Success Response**: `HTTP 200 OK`
    ```json
    [
      {
        "id": 201,
        "roomId": 101,
        "sender": { "id": 1, "username": "user1" },
        "content": "Hello from user 1",
        "sentAt": "2023-10-27T10:50:00"
      },
      {
        "id": 202,
        "roomId": 101,
        "sender": { "id": 2, "username": "user2" },
        "content": "Hi there!",
        "sentAt": "2023-10-27T10:51:00"
      }
    ]
    ```
*   **Error Responses**:
    *   `HTTP 404 Not Found` (Room not found)
    *   `HTTP 403 Forbidden` (User not a member of the room)

---

## 5. WebSocket Endpoints (`/ws/chat`)

*   **Endpoint**: `ws://localhost:8080/ws/chat` (use SockJS client for browser compatibility)
*   **Protocol**: STOMP over WebSocket
*   **Authentication**: The client should send the JWT token in a custom header (e.g., `X-Auth-Token`) during the STOMP `CONNECT` frame.

### 5.1 Send Message

*   **Destination**: `/app/chat.sendMessage`
*   **Description**: Sends a new message to a specific chat room.
*   **Payload (JSON)**:
    ```json
    {
      "roomId": 101,
      "content": "This is a real-time message!"
    }
    ```
*   **Response**: The message will be broadcasted to all subscribers of the room's topic.

### 5.2 Join User (Initial connection)

*   **Destination**: `/app/chat.addUser`
*   **Description**: Notifies the server of a new user connecting. The server might store session attributes.
*   **Payload (JSON)**: (Can be an empty object or minimal user info)
    ```json
    {
      "sender": { "username": "currentuser" }
    }
    ```

### 5.3 Subscribe to Room Messages

*   **Destination**: `/topic/rooms/{roomId}`
*   **Description**: Clients subscribe to this topic to receive all messages sent to `roomId`.
*   **Example Subscription**: `stompClient.subscribe('/topic/rooms/101', callbackFunction);`
*   **Received Message Payload (JSON)**:
    ```json
    {
      "id": 203,
      "roomId": 101,
      "sender": { "id": 1, "username": "user1", "email": "user1@example.com" },
      "content": "This is a real-time message!",
      "sentAt": "2023-10-27T10:55:00"
    }
    ```

---
```