# ML-Utilities-Pro: Architecture Documentation

## 1. High-Level Architecture

The ML-Utilities-Pro system follows a microservices-inspired architecture, decomposed into a separate backend API, a frontend client, a dedicated database, and a caching/messaging layer (Redis). All components are containerized for portability and ease of deployment.

```
+------------------+     +------------------+     +------------------+     +-----------------+
|   Frontend App   |<---->|   Backend API    |<---->|   PostgreSQL DB  |     |      Redis      |
|    (React.js)    |     | (Node.js/Express)|     |     (Data)       |<----+   (Cache/Sessions)  |
+------------------+     +------------------+     +------------------+     +-----------------+
        ^                        ^                                             ^
        |                        |                                             |
        |                        | (API Gateway/Load Balancer)                 |
        |                        |                                             |
+------------------------------------------------------------------------------------------------+
|                                    Internet / User Access                                      |
+------------------------------------------------------------------------------------------------+
```

**Key Architectural Principles:**

*   **Separation of Concerns:** Frontend, backend, and database are distinct services.
*   **Stateless Backend:** The backend API is largely stateless, relying on JWT for authentication and Redis for session/cache if needed.
*   **Containerization:** Docker is used for packaging applications, ensuring environment consistency.
*   **Orchestration:** Docker Compose is used for local development orchestration.
*   **Scalability:** Individual components can be scaled independently.
*   **Modularity:** Codebase within each service is organized into distinct modules (controllers, services, models, routes, etc.).

## 2. Component Breakdown

### 2.1. Frontend Application (React.js)

*   **Technology Stack:** React.js, React Router, Axios, Tailwind CSS (for styling).
*   **Purpose:** Provides a responsive and interactive user interface for interacting with the ML Utility services.
*   **Key Responsibilities:**
    *   User authentication (login, registration).
    *   Displaying ML projects and tasks.
    *   Providing forms for inputting data and parameters for ML utility execution.
    *   Visualizing the results of ML tasks.
    *   Client-side routing and state management (using React Context for authentication).
*   **Architecture:**
    *   **Components:** Reusable UI elements (buttons, inputs, cards, modals).
    *   **Pages:** Top-level components representing distinct views (Login, Register, Dashboard, Project Details, Task Form).
    *   **Contexts:** Global state management (e.g., `AuthContext`).
    *   **API Layer:** `axios` instance for making authenticated requests to the backend API.
    *   **Hooks:** Custom hooks for encapsulating reusable logic.

### 2.2. Backend API (Node.js/Express.js)

*   **Technology Stack:** Node.js, Express.js, PostgreSQL, Sequelize ORM, JWT, bcrypt, Winston, Redis.
*   **Purpose:** Exposes RESTful API endpoints for managing users, projects, ML tasks, and executing the core ML utility logic.
*   **Key Responsibilities:**
    *   User authentication and authorization.
    *   Handling CRUD operations for `User`, `Project`, and `MLTask` resources.
    *   Processing and executing ML utility functions (data preprocessing, metrics calculation).
    *   Data validation and sanitization.
    *   Error handling, logging, rate limiting, and caching.
    *   Interacting with the PostgreSQL database.
*   **Architecture (Modular Approach):**
    *   **`server.js`:** Entry point, initializes Express app.
    *   **`app.js`:** Configures Express middleware, routes, and error handlers.
    *   **`config/`:** Centralized configuration for database, server, JWT, logging.
    *   **`db/`:** Database connection setup, Sequelize configuration, migration management.
    *   **`models/`:** Sequelize model definitions, defining database schema and relationships.
    *   **`middleware/`:** Express middleware for authentication, error handling, logging, rate limiting, caching.
    *   **`routes/`:** Defines API endpoints and maps them to controller functions.
    *   **`controllers/`:** Contains the request handling logic, calls services, and sends responses. Responsible for processing request parameters and formatting responses.
    *   **`services/`:** Encapsulates business logic. Interacts directly with database models (via Sequelize) and other utilities.
    *   **`utils/`:** Helper functions (e.g., JWT token generation/verification, password hashing, `ml-math` for core ML logic, validation utilities).
    *   **`tests/`:** Organized tests for unit, integration, and performance.

### 2.3. Database (PostgreSQL)

*   **Technology Stack:** PostgreSQL.
*   **Purpose:** Persistent storage for application data.
*   **Key Responsibilities:**
    *   Storing user information (hashed passwords).
    *   Storing project details.
    *   Storing ML task details, including input data, parameters, and output results.
*   **Schema Design:**
    *   `Users`: `id`, `username`, `email`, `password_hash`, `role`, `createdAt`, `updatedAt`.
    *   `Projects`: `id`, `name`, `description`, `userId`, `createdAt`, `updatedAt`. (A user can have many projects).
    *   `MLTasks`: `id`, `projectId`, `type`, `inputData`, `parameters`, `outputData`, `status`, `createdAt`, `updatedAt`. (A project can have many ML tasks).
*   **Management:** Sequelize ORM is used for defining models, executing migrations, and performing CRUD operations.

### 2.4. Caching/Messaging (Redis)

*   **Technology Stack:** Redis.
*   **Purpose:** Used primarily for session management (e.g., rate limiting middleware) and potential API response caching.
*   **Key Responsibilities:**
    *   Storing rate limit counters.
    *   Could be extended for more general-purpose caching (e.g., frequently accessed static data or heavy computation results).

## 3. Data Flow

1.  **User Interaction (Frontend):** A user interacts with the React frontend to, for example, create a new project or execute an ML utility task.
2.  **API Request (Frontend to Backend):** The frontend sends an authenticated HTTP request (e.g., POST `/api/projects`, POST `/api/ml-tasks`) to the backend API. JWT token is included in the `Authorization` header.
3.  **Middleware Processing (Backend):**
    *   The request first passes through logging middleware.
    *   Then, rate limiting middleware checks if the user/IP has exceeded limits (using Redis).
    *   Authentication middleware verifies the JWT token and populates `req.user`.
    *   Authorization middleware checks if the user has permission for the requested action.
    *   (Optional) Caching middleware checks if the response is already cached in Redis.
4.  **Controller & Service Layer (Backend):**
    *   The request reaches the appropriate controller.
    *   The controller extracts data from `req.body` or `req.params`.
    *   It calls a corresponding service method to handle the business logic.
    *   The service interacts with Sequelize models to perform database operations (e.g., saving a new project) or calls ML utility functions from `utils/ml-math.js`.
    *   For ML tasks, the service processes `inputData` and `parameters`, calls the relevant `ml-math` function, and stores the `outputData`.
5.  **Database Interaction:** The service layer, via Sequelize, communicates with the PostgreSQL database to store or retrieve data.
6.  **Response Generation (Backend):**
    *   The service returns data to the controller.
    *   The controller formats the response (JSON) and sends it back to the frontend.
    *   If an error occurs, the centralized error handling middleware catches it and sends a standardized error response.
7.  **Data Rendering (Frontend):** The frontend receives the JSON response and updates the UI accordingly.

## 4. Security Considerations

*   **Authentication:** JWT with `httpOnly` cookies (for browser clients, though here using `Bearer` token in header for simplicity and API design).
*   **Authorization:** Role-based access control (RBAC).
*   **Password Hashing:** `bcrypt` for secure password storage.
*   **Input Validation:** Joi (or similar) for validating all incoming API request data.
*   **Rate Limiting:** Protects against brute-force attacks and resource exhaustion.
*   **Error Handling:** Generic error messages to prevent information leakage.
*   **Environment Variables:** Sensitive configurations (JWT secret, DB credentials) are stored in `.env` files and not committed to source control.
*   **CORS:** Configured to allow only trusted origins.

## 5. Deployment Considerations

*   **Containerization:** Docker images for reproducible environments.
*   **Orchestration:** Kubernetes for production-grade orchestration (beyond Docker Compose for local dev).
*   **CI/CD:** Automated testing, building, and deployment using GitHub Actions.
*   **Monitoring & Logging:** Centralized logging (Winston) and potential integration with APM tools.
*   **Secrets Management:** Use proper secrets management (e.g., Vault, Kubernetes Secrets) for production.
*   **Load Balancing:** Distribute traffic across multiple backend instances.

This architecture provides a solid foundation for a robust, scalable, and maintainable ML utility system, adhering to modern software engineering best practices.

---