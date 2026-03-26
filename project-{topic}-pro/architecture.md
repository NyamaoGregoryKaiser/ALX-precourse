# ALX CMS Architecture Documentation

This document provides a high-level overview of the ALX CMS project's architecture, key components, and their interactions.

## 1. High-Level Overview

The ALX CMS follows a typical multi-layered architecture:

*   **Frontend:** A client-side web application (HTML, CSS, JavaScript) that interacts with the backend API.
*   **Backend:** A C++ RESTful API server responsible for business logic, data processing, authentication, and communication with the database.
*   **Database:** A PostgreSQL database serving as the persistent data store.

The components are containerized using Docker, allowing for easy deployment and scalability. Nginx acts as a reverse proxy for the frontend, also capable of routing API requests to the backend.

```
+----------------+       +----------------+       +----------------+
|                |       |                |       |                |
|  User/Browser  | <---> |    Frontend    | <---> |     Nginx      |
|                |       | (HTML/CSS/JS)  |       | (Reverse Proxy)|
+----------------+       +----------------+       +----------------+
                                   | HTTP(S)           /|\
                                   |                    |
                                   | REST API Requests  | (Proxy `/api/`)
                                   |                    |
                                   \|/                  |
+-------------------------------------------------------------------+
|                            C++ Backend Application                |
|                                (Docker Container)                 |
|   +---------------+   +------------------+   +----------------+ |
|   | Controllers   |-->|     Services     |-->|   Repositories   |--> Database
|   | (API Endpoints)|   | (Business Logic) |   | (Data Access)    |    (PostgreSQL)
|   +---------------+   +------------------+   +----------------+ |
|        /|\ |                     /|\ |                          |
|         |  +---------------------+   +--------------------------+
|         |                            |
|      Middleware                      |
| (Auth, Logging, Error, Cache, Rate Limit)                      |
|                                                                  |
+-------------------------------------------------------------------+
```

## 2. Component Breakdown

### 2.1. Frontend (HTML/CSS/JS + Nginx)

*   **Purpose:** Provides the user interface for interacting with the CMS.
*   **Technologies:** HTML, CSS, Vanilla JavaScript (or a modern framework like React/Vue/Angular for a more complex UI).
*   **Interaction:** Communicates with the C++ Backend via RESTful API calls.
*   **Deployment:** Served by Nginx as static files. Nginx also handles routing API requests to the backend service.
*   **Scaling:** Stateless, can be scaled horizontally by adding more Nginx/frontend containers.

### 2.2. C++ Backend Application

The backend is built with C++17 and follows a layered architecture to ensure separation of concerns, testability, and maintainability.

#### a. API Server (Pistache)
*   **Role:** The entry point for all HTTP requests. It uses `Pistache` to define routes and handle HTTP methods.
*   **Functionality:**
    *   Parses incoming requests (headers, body, query parameters).
    *   Routes requests to appropriate controllers.
    *   Sends HTTP responses.

#### b. Middleware
*   **Role:** A chain of functions that process requests before they reach the main handler and/or after the handler completes.
*   **Components:**
    *   **Request Logging:** Logs details of incoming requests (`spdlog`).
    *   **Rate Limiting:** Protects against abuse by limiting requests per IP address over a time window.
    *   **Error Handling:** Catches exceptions thrown by controllers/services/repositories and formats appropriate HTTP error responses.
    *   **Authentication (`AuthMiddleware`):** Verifies JWT tokens and extracts user information. Determines if a user is authenticated.
    *   **Authorization:** (Implicitly handled by services/controllers after authentication) Checks user roles and permissions against requested actions/resources.
    *   **Caching:** (Conceptual) Intercepts requests for cached content, serves from cache if available, or caches responses.

#### c. Controllers
*   **Role:** Handle specific API endpoints. They receive requests, delegate tasks to services, and format responses.
*   **Responsibilities:**
    *   Parsing request body and query parameters (e.g., using `nlohmann::json`).
    *   Input validation (basic).
    *   Calling appropriate service methods.
    *   Serializing service responses into JSON.
    *   Setting HTTP status codes.
*   **Examples:** `AuthController`, `UserController`, `ContentController`.

#### d. Services
*   **Role:** Encapsulate the core business logic of the application. They orchestrate operations involving multiple repositories or complex validations.
*   **Responsibilities:**
    *   Applying business rules and validations.
    *   Performing complex data manipulations.
    *   Interacting with one or more repositories.
    *   Handling transactional integrity (though not explicitly shown in current snippets, a `UnitOfWork` pattern could be implemented here).
    *   **Authorization Logic:** Implement granular permission checks based on user roles and resource ownership (e.g., only an admin can delete any user, a user can only edit their own profile).
*   **Examples:** `UserService`, `ContentService`.

#### e. Repositories
*   **Role:** Provide an abstraction layer over the data persistence (database). They map between C++ objects (models) and database records.
*   **Responsibilities:**
    *   Executing CRUD (Create, Read, Update, Delete) operations.
    *   Handling database-specific logic (SQL queries, connection management with `libpqxx`).
    *   Mapping `pqxx::result` rows to C++ model structs.
    *   Connection Pooling (could be an enhancement).
*   **Examples:** `UserRepository`, `ContentRepository`.

#### f. Models / DTOs
*   **Role:** Represent the data structures used throughout the application.
    *   **Models:** C++ structs representing database entities (e.g., `User`, `Content`).
    *   **DTOs (Data Transfer Objects):** C++ structs for specific API request/response payloads (e.g., `UserCreateDTO`, `UserResponseDTO`). This helps decouple internal data structures from external API contracts.

#### g. Utilities
*   **Role:** Provide common, reusable functionalities not tied to specific business logic.
*   **Examples:** `JWTManager` (for token creation/validation), `Config` (environment variable loading), `PasswordHasher` (for secure password handling).

### 2.3. Database (PostgreSQL)

*   **Role:** Stores all persistent application data.
*   **Schema:** Defined using SQL DDL scripts (`001_initial_schema.sql`).
*   **Migrations:** Handled via versioned SQL scripts, applied on container startup (or by a dedicated migration tool).
*   **Indexing:** Utilized for query optimization to improve read performance.

## 3. Data Flow Example: User Registration

1.  **Frontend:** User submits registration form, `POST` request to `/auth/register` with username, email, password.
2.  **Nginx:** Receives request, proxies it to the `backend` service.
3.  **C++ Backend - Middleware:**
    *   `RequestLoggerMiddleware`: Logs the incoming request.
    *   `RateLimitingMiddleware`: Checks if the IP has exceeded request limits.
    *   `ErrorHandlingMiddleware`: Wraps the execution to catch exceptions.
    *   `AuthMiddleware`: Skips as `/auth/register` is a public route.
4.  **C++ Backend - `AuthController::handle_register`:**
    *   Parses the JSON request body into a `UserCreateDTO`.
    *   Calls `UserService::register_user(create_dto)`.
5.  **C++ Backend - `UserService::register_user`:**
    *   Performs business logic: checks if email already exists (`UserRepository::find_by_email`).
    *   Validates password strength.
    *   Hashes the password (`PasswordHasher::hash_password`).
    *   Creates a `User` model object.
    *   Calls `UserRepository::create(user)`.
6.  **C++ Backend - `UserRepository::create`:**
    *   Establishes a connection to PostgreSQL (`libpqxx`).
    *   Executes an `INSERT` SQL query to create a new user record.
    *   Retrieves the auto-generated user `id`.
    *   Maps the database response back to the `User` model.
7.  **C++ Backend - `UserService::register_user` (returns):**
    *   Receives the created `User` model.
    *   Converts it to a `UserResponseDTO`.
    *   Returns the DTO.
8.  **C++ Backend - `AuthController::handle_register` (returns):**
    *   Formats the `UserResponseDTO` into a JSON response.
    *   Sets HTTP status `201 Created`.
    *   Sends the response.
9.  **Nginx:** Receives backend response and forwards it to the frontend.
10. **Frontend:** Receives response, updates UI (e.g., shows success message, redirects to login).

## 4. Scalability Considerations

*   **Stateless Backend:** The C++ backend is designed to be stateless (session state handled by JWTs). This allows horizontal scaling by running multiple instances.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding, though the latter is more complex).
*   **Caching:** Implementing an external caching layer (e.g., Redis) can significantly reduce database load for frequently accessed data.
*   **Asynchronous Processing:** For long-running tasks (e.g., image processing, email sending), integrating with a message queue (RabbitMQ, Kafka) and separate worker services would improve responsiveness.

## 5. Security Considerations

*   **HTTPS:** Nginx should be configured with SSL/TLS certificates for production to encrypt all traffic.
*   **JWT Security:** Strong, frequently rotated `JWT_SECRET` is crucial. Tokens should have reasonable expiration times.
*   **Password Hashing:** Use strong, industry-standard hashing algorithms (bcrypt, Argon2) with appropriate salt and cost factor.
*   **Input Validation:** Sanitize and validate all user inputs to prevent SQL injection, XSS, and other vulnerabilities.
*   **Role-Based Access Control (RBAC):** Implemented in services to ensure users can only perform authorized actions.
*   **Rate Limiting:** Protects against brute-force attacks and DoS.
*   **Least Privilege:** Database user should only have necessary permissions.

This architecture provides a solid foundation for a production-ready CMS, enabling future expansion and maintenance.