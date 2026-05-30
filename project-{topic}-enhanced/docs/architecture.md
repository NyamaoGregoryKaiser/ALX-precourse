# Architecture Overview: Task Management System

This document outlines the high-level architecture of the Enterprise Task Management System.

## 1. High-Level Diagram

```
+----------------+       +-------------------+       +-------------------+
|                |       |  API Gateway /    |       |                   |
|  User (Browser)| <---> |  Load Balancer    | <---> |    Frontend       |
|                |       |    (Nginx/CDN)    |       |   (React.js SPA)  |
+----------------+       +-------------------+       +---------+---------+
                                                       |         |
                                                       | HTTP(S) |
                                                       |         |
                                                       v         v
                                                 +-----+---------+-----+
                                                 |      Backend API      |
                                                 |   (Node.js / Express) |
                                                 |  Auth, CRUD, Business |
                                                 |     Logic, Logging    |
                                                 +-----------+-----------+
                                                             |
                                               +-------------+-------------+
                                               |             |             |
                                               | PostgreSQL  |    Redis    |
                                               |  (Database) |   (Cache)   |
                                               +-------------+-------------+
```

## 2. Components and Their Responsibilities

### 2.1. Frontend (Client Application)

*   **Technology**: React.js (Single Page Application)
*   **Responsibility**:
    *   User Interface and User Experience.
    *   Making API requests to the Backend.
    *   Handling client-side routing.
    *   Storing JWT tokens securely (e.g., in `localStorage` for access, and `HttpOnly` cookie for refresh tokens if deployed with secure cookies). This implementation uses `localStorage` for simplicity, but `HttpOnly` cookies are generally more secure for refresh tokens.
    *   Displaying data and managing UI state.
*   **Communication**: Communicates with the Backend API using Axios over HTTP/HTTPS.

### 2.2. API Gateway / Load Balancer (Conceptual)

*   **Technology**: Nginx, AWS ALB/CloudFront, Google Cloud Load Balancer, etc.
*   **Responsibility**:
    *   **Traffic Distribution**: Distributes incoming requests across multiple instances of the frontend (if SSR) and backend services.
    *   **SSL Termination**: Handles HTTPS encryption/decryption, offloading this task from individual services.
    *   **Static File Serving**: Serves static assets (e.g., React build files) efficiently.
    *   **Security**: Provides an additional layer of security, potentially handling WAF (Web Application Firewall), DDoS protection, rate limiting, and basic authentication/authorization before requests reach the backend.
    *   **Reverse Proxy**: Routes requests to the appropriate backend services.
*   **Note**: In the provided Docker Compose setup, the Nginx container serves the static frontend, and the React development server's proxy handles API requests directly to the backend. A dedicated API Gateway/Load Balancer would sit in front of both in a production deployment.

### 2.3. Backend API

*   **Technology**: Node.js with Express.js
*   **Responsibility**:
    *   **API Endpoints**: Exposes RESTful API endpoints for all CRUD operations and business logic.
    *   **Authentication & Authorization**: Manages user registration, login (JWT generation, verification, and refresh), and enforces Role-Based Access Control (RBAC) using custom middleware.
    *   **Business Logic**: Contains the core business rules for managing users, projects, tasks, and comments (within `services`).
    *   **Data Validation**: Validates all incoming request data using Joi schemas (`middleware/validate`).
    *   **Error Handling**: Centralized error handling (`middleware/error`) for consistent and secure error responses.
    *   **Security Middleware**: Applies Helmet.js for HTTP header security, XSS cleaning, and rate limiting.
    *   **Logging**: Records application events, errors, and security-relevant actions using Winston (`utils/logger`).
*   **Communication**:
    *   Communicates with PostgreSQL for persistent data storage.
    *   Communicates with Redis for caching and refresh token blacklisting.

### 2.4. PostgreSQL (Database)

*   **Technology**: PostgreSQL
*   **Responsibility**:
    *   **Persistent Storage**: Stores all application data (users, projects, tasks, comments, tokens).
    *   **Data Integrity**: Ensures data consistency and integrity through schema definitions, relationships, and constraints.
    *   **Scalability**: Chosen for its robustness, reliability, and advanced features suitable for enterprise-grade applications.
*   **ORM**: Sequelize is used by the backend to interact with the database, providing an abstraction layer that helps prevent SQL injection attacks.

### 2.5. Redis (Cache / Session Store)

*   **Technology**: Redis
*   **Responsibility**:
    *   **Refresh Token Blacklisting**: Stores invalidated refresh tokens to prevent their reuse after logout or compromise. This is crucial for security.
    *   **Caching**: Can be extended to cache frequently accessed data or API responses to improve performance and reduce database load.
    *   **Rate Limiting**: Used by `express-rate-limit` to store IP counts and manage request limits efficiently.
*   **Communication**: The Backend API connects directly to Redis.

## 3. Data Flow

1.  **User Request**: A user interacts with the Frontend application in their browser.
2.  **Frontend API Call**: The Frontend makes an HTTP(S) request to the Backend API (e.g., `/v1/projects`).
3.  **API Gateway/Load Balancer**: (If present) Routes the request to an available Backend API instance. Handles SSL.
4.  **Backend Processing**:
    *   **Middleware**: Request passes through security middleware (Helmet, CORS, Rate Limiting), authentication, and validation middleware.
    *   **Authentication**: If authenticated, the JWT access token is verified. User identity and roles are attached to the request (`req.user`).
    *   **Authorization**: Checks if `req.user` has the necessary rights for the requested action based on RBAC.
    *   **Controller**: The appropriate controller function receives the validated request.
    *   **Service**: The controller calls the relevant service function, which contains the business logic.
    *   **Database Interaction**: The service interacts with PostgreSQL (via Sequelize) to perform CRUD operations.
    *   **Redis Interaction**: May interact with Redis for caching, token blacklisting, or rate limit checks.
    *   **Logging**: Events and errors are logged at various stages.
5.  **Response Generation**: The service returns data to the controller, which formats the API response.
6.  **Response Back to Frontend**: The Backend sends the HTTP response back through the API Gateway (if applicable) to the Frontend.
7.  **Frontend Rendering**: The Frontend receives the data and updates the UI accordingly.

## 4. Scalability Considerations

*   **Stateless Backend**: The Node.js backend is designed to be stateless (session information is stored in JWTs and external Redis), allowing for easy horizontal scaling by adding more instances.
*   **Database Scaling**: PostgreSQL can be scaled vertically (more powerful server) or horizontally using replication (read replicas) and sharding (for very large datasets).
*   **Redis Scaling**: Redis can be scaled using master-replica setups for high availability and sharding for larger data sets.
*   **Load Balancing**: An API Gateway/Load Balancer is essential for distributing traffic and managing multiple instances of backend services.
*   **Containerization**: Docker and Docker Compose provide portability and enable orchestration with Kubernetes for advanced scaling and management.

This architecture provides a solid foundation for a secure, scalable, and maintainable enterprise application.