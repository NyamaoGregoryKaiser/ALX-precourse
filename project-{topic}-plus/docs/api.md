# Project Management API Documentation

This document describes the RESTful API for the Project Management System.

**Base URL**: `http://localhost:18080` (or as configured in `.env`)

## Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header, formatted as `Bearer <token>`.

### Register User
*   **Endpoint**: `/auth/register`
*   **Method**: `POST`
*   **Description**: Registers a new user account.
*   **Request Body**:
    ```json
    {
        "username": "unique_username",
        "email": "user@example.com",
        "password": "strong_password_123"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
        "message": "User registered successfully.",
        "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input (e.g., missing fields).
    *   `409 Conflict`: User with email already exists.
    *   `500 Internal Server Error`: Server-side error.

### Login User
*   **Endpoint**: `/auth/login`
*   **Method**: `POST`
*   **Description**: Authenticates a user and returns a JWT token.
*   **Request Body**:
    ```json
    {
        "email": "user@example.com",
        "password": "strong_password_123"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
        "message": "Login successful.",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9qZWN0LW1hbmFnZW1lbnQtYXBpIiwic3ViIjoidXNlci0xMjMiLCJqdGkiOiIyYzVhYzg4ZGY2NzM0YmQ0OWJiMTliZDc2NmM2Yzc0ZiIsImlhdCI6MTcwMjMyOTYwMCwiZXhwIjoxNzAyMzMzMjAwLCJ1c2VyX2lkIjoidXNlci0xMjMiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.some_jwt_signature"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`: Invalid credentials.
    *   `500 Internal Server Error`: Server-side error.

---

## User Endpoints (Protected)

### Get Current User Profile
*   **Endpoint**: `/users/me`
*   **Method**: `GET`
*   **Description**: Retrieves the profile of the authenticated user.
*   **Authentication**: Required
*   **Response (200 OK)**:
    ```json
    {
        "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "username": "adminuser",
        "email": "admin@example.com",
        "created_at": "2023-12-10T12:00:00Z",
        "updated_at": "2023-12-10T12:00:00Z"
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `404 Not Found`: User not found (unlikely for `/me` if authenticated).
    *   `500 Internal Server Error`: Server-side error.

### Get User by ID
*   **Endpoint**: `/users/{user_id}`
*   **Method**: `GET`
*   **Description**: Retrieves a specific user's profile. **Authorization**: Only allows access to the authenticated user's own profile.
*   **Authentication**: Required
*   **Response (200 OK)**: Same as `GET /users/me`.
*   **Error Responses**:
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: Attempt to access another user's profile.
    *   `404 Not Found`: User not found.
    *   `500 Internal Server Error`.

### Update User Profile
*   **Endpoint**: `/users/{user_id}`
*   **Method**: `PUT`
*   **Description**: Updates the profile of the authenticated user.
*   **Authentication**: Required
*   **Authorization**: Only the authenticated user can update their own profile.
*   **Request Body**:
    ```json
    {
        "username": "new_username",
        "email": "new_email@example.com",
        "password": "new_strong_password"
    }
    ```
    (Any combination of fields can be sent)
*   **Response (200 OK)**: Updated User object.
*   **Error Responses**:
    *   `400 Bad Request`: Invalid input.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### Delete User
*   **Endpoint**: `/users/{user_id}`
*   **Method**: `DELETE`
*   **Description**: Deletes the authenticated user's account.
*   **Authentication**: Required
*   **Authorization**: Only the authenticated user can delete their own account.
*   **Response (204 No Content)**: Empty response.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

---

## Project Endpoints (Protected)

### Get All Projects (accessible to user)
*   **Endpoint**: `/projects`
*   **Method**: `GET`
*   **Description**: Retrieves a list of all projects that the authenticated user is an owner or member of.
*   **Authentication**: Required
*   **Response (200 OK)**:
    ```json
    [
        {
            "id": "p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "name": "Website Redesign",
            "description": "Complete overhaul of the company website",
            "start_date": "2023-01-01",
            "end_date": "2023-06-30",
            "status": "in-progress",
            "owner_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "team_id": "t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "created_at": "2023-12-10T12:00:00Z",
            "updated_at": "2023-12-10T12:00:00Z"
        },
        // ... more projects
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `500 Internal Server Error`.

### Create New Project
*   **Endpoint**: `/projects`
*   **Method**: `POST`
*   **Description**: Creates a new project. The authenticated user will be set as the project owner.
*   **Authentication**: Required
*   **Request Body**:
    ```json
    {
        "name": "New Awesome Project",
        "description": "This project aims to do X, Y, Z.",
        "start_date": "2024-01-01",
        "end_date": "2024-03-31",
        "status": "planning",
        "team_id": "t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    }
    ```
    (`description`, `start_date`, `end_date`, `status`, `team_id` are optional)
*   **Response (201 Created)**: Created Project object.
*   **Error Responses**:
    *   `400 Bad Request`: Missing project `name` or invalid input.
    *   `401 Unauthorized`.
    *   `500 Internal Server Error`.

### Get Project by ID
*   **Endpoint**: `/projects/{project_id}`
*   **Method**: `GET`
*   **Description**: Retrieves details for a specific project.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the project.
*   **Response (200 OK)**: Single Project object.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`: User is not a member of the project.
    *   `404 Not Found`: Project not found.
    *   `500 Internal Server Error`.

### Update Project
*   **Endpoint**: `/projects/{project_id}`
*   **Method**: `PUT`
*   **Description**: Updates an existing project's details.
*   **Authentication**: Required
*   **Authorization**: User must be the owner of the project.
*   **Request Body**: Same as `POST /projects`, but only provide fields to update.
*   **Response (200 OK)**: Updated Project object.
*   **Error Responses**:
    *   `400 Bad Request`.
    *   `401 Unauthorized`.
    *   `403 Forbidden`: User is not the project owner.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### Delete Project
*   **Endpoint**: `/projects/{project_id}`
*   **Method**: `DELETE`
*   **Description**: Deletes a project.
*   **Authentication**: Required
*   **Authorization**: User must be the owner of the project.
*   **Response (204 No Content)**.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

---

## Task Endpoints (Protected)

### Get All Tasks for a Project
*   **Endpoint**: `/projects/{project_id}/tasks`
*   **Method**: `GET`
*   **Description**: Retrieves all tasks associated with a specific project.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the project.
*   **Response (200 OK)**:
    ```json
    [
        {
            "id": "k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "project_id": "p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "title": "Design new homepage layout",
            "description": "Create wireframes and mockups for the new homepage",
            "due_date": "2023-01-15",
            "status": "done",
            "assigned_to_id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
            "created_at": "2023-12-10T12:00:00Z",
            "updated_at": "2023-12-10T12:00:00Z"
        },
        // ... more tasks
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Project not found.
    *   `500 Internal Server Error`.

### Create New Task in a Project
*   **Endpoint**: `/projects/{project_id}/tasks`
*   **Method**: `POST`
*   **Description**: Creates a new task within a specified project.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the project.
*   **Request Body**:
    ```json
    {
        "title": "Implement Login Feature",
        "description": "Develop backend and frontend for user login.",
        "due_date": "2024-01-15",
        "status": "in-progress",
        "assigned_to_id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"
    }
    ```
    (`description`, `due_date`, `status`, `assigned_to_id` are optional)
*   **Response (201 Created)**: Created Task object.
*   **Error Responses**:
    *   `400 Bad Request`.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Project not found.
    *   `500 Internal Server Error`.

### Get Task by ID (within a project)
*   **Endpoint**: `/projects/{project_id}/tasks/{task_id}`
*   **Method**: `GET`
*   **Description**: Retrieves details for a specific task within a project.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the project. Task must belong to the project.
*   **Response (200 OK)**: Single Task object.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Project or task not found in that project.
    *   `500 Internal Server Error`.

### Update Task
*   **Endpoint**: `/projects/{project_id}/tasks/{task_id}`
*   **Method**: `PUT`
*   **Description**: Updates an existing task's details.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the project.
*   **Request Body**: Same as `POST /projects/{project_id}/tasks`, but only provide fields to update.
*   **Response (200 OK)**: Updated Task object.
*   **Error Responses**:
    *   `400 Bad Request`.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### Delete Task
*   **Endpoint**: `/projects/{project_id}/tasks/{task_id}`
*   **Method**: `DELETE`
*   **Description**: Deletes a task from a project.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the project.
*   **Response (204 No Content)**.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

---

## Team Endpoints (Protected)

### Get All Teams
*   **Endpoint**: `/teams`
*   **Method**: `GET`
*   **Description**: Retrieves a list of all teams.
*   **Authentication**: Required
*   **Response (200 OK)**:
    ```json
    [
        {
            "id": "t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            "name": "Frontend Team",
            "description": "Team responsible for UI/UX development",
            "created_at": "2023-12-10T12:00:00Z",
            "updated_at": "2023-12-10T12:00:00Z"
        },
        // ... more teams
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `500 Internal Server Error`.

### Create New Team
*   **Endpoint**: `/teams`
*   **Method**: `POST`
*   **Description**: Creates a new team.
*   **Authentication**: Required
*   **Request Body**:
    ```json
    {
        "name": "New Team Name",
        "description": "Description of the new team."
    }
    ```
    (`description` is optional)
*   **Response (201 Created)**: Created Team object.
*   **Error Responses**:
    *   `400 Bad Request`.
    *   `401 Unauthorized`.
    *   `500 Internal Server Error`.

### Get Team by ID
*   **Endpoint**: `/teams/{team_id}`
*   **Method**: `GET`
*   **Description**: Retrieves details for a specific team, including member IDs.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the team.
*   **Response (200 OK)**:
    ```json
    {
        "id": "t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "name": "Frontend Team",
        "description": "Team responsible for UI/UX development",
        "created_at": "2023-12-10T12:00:00Z",
        "updated_at": "2023-12-10T12:00:00Z",
        "member_ids": ["b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"]
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### Update Team
*   **Endpoint**: `/teams/{team_id}`
*   **Method**: `PUT`
*   **Description**: Updates an existing team's details.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the team. (For production, this would be restricted to team admins/owners).
*   **Request Body**: Same as `POST /teams`, but only provide fields to update.
*   **Response (200 OK)**: Updated Team object.
*   **Error Responses**:
    *   `400 Bad Request`.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### Delete Team
*   **Endpoint**: `/teams/{team_id}`
*   **Method**: `DELETE`
*   **Description**: Deletes a team.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the team. (For production, this would be restricted to team admins/owners).
*   **Response (204 No Content)**.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### Get Team Members
*   **Endpoint**: `/teams/{team_id}/members`
*   **Method**: `GET`
*   **Description**: Retrieves a list of user IDs who are members of the team.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the team.
*   **Response (200 OK)**:
    ```json
    [
        "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13"
    ]
    ```
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Team not found.
    *   `500 Internal Server Error`.

### Add Member to Team
*   **Endpoint**: `/teams/{team_id}/members`
*   **Method**: `POST`
*   **Description**: Adds a user to the specified team.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the team. (For production, restricted to team admins/owners).
*   **Request Body**:
    ```json
    {
        "user_id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
        "message": "User b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12 added to team t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Team or user not found.
    *   `500 Internal Server Error`.

### Remove Member from Team
*   **Endpoint**: `/teams/{team_id}/members/{user_id}`
*   **Method**: `DELETE`
*   **Description**: Removes a user from the specified team.
*   **Authentication**: Required
*   **Authorization**: User must be a member of the team. (For production, restricted to team admins/owners or the user themselves).
*   **Response (204 No Content)**.
*   **Error Responses**:
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Team or user not found as a member.
    *   `500 Internal Server Error`.
```