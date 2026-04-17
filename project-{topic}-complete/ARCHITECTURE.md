# ALX E-commerce System - Architecture Documentation

This document outlines the architectural design and principles of the ALX E-commerce System backend.

## 1. High-Level Architecture

The system follows a classic **Monolithic Microservice** (or layered monolithic) architecture for the backend API, backed by a relational database, and designed to be consumed by a separate frontend client.

```mermaid
graph TD
    A[Client: Web Browser/Mobile App] -->|HTTP/REST| B(Load Balancer / API Gateway - Nginx/Cloud LB)
    B --> C[E-commerce Backend Service]
    C --> D[Database: PostgreSQL]
    C --> E[Cache: Caffeine (in-memory)]
    C --> F[External Services (e.g., Payment Gateway, Email Service - conceptual)]

    subgraph Monitoring & Ops
        G[Prometheus] --> H[Grafana]
        I[Log Aggregation (e.g., Loki)] --> J[Alerting]
    end

    C -- Logs --> I
    C -- Metrics --> G
```

*   **Client:** A separate frontend application (Web or Mobile) interacts with the backend via RESTful APIs.
*   **Load Balancer / API Gateway:** Distributes incoming traffic, provides SSL termination, and potentially handles rate limiting, authentication, and routing before requests reach the backend service. (Conceptual; Nginx or cloud-managed load balancers would fill this role in production).
*   **E-commerce Backend Service:** The core Spring Boot application, responsible for all business logic, data persistence, and API exposure.
*   **Database (PostgreSQL):** The primary data store for all application data.
*   **Cache (Caffeine):** An in-memory cache to reduce database load and improve response times for frequently accessed data.
*   **External Services:** Integration points for functionalities like payment processing, email notifications, etc. (Not fully implemented in this example but designed for).
*   **Monitoring & Ops:** Tools for collecting metrics (Prometheus), visualizing data (Grafana), and centralizing logs (Loki) for operational visibility and alerting.

## 2. Backend Service Architecture (Layered)

The Spring Boot application follows a traditional **layered architecture** to separate concerns:

```mermaid
graph TD
    A[Client Requests (JSON)] --> B(Controller Layer)
    B --> C(Service Layer)
    C --> D(Repository Layer)
    D --> E[Database (PostgreSQL)]
    C --> F[Caching Layer (Caffeine)]

    subgraph Cross-Cutting Concerns
        G[Spring Security & JWT]
        H[Global Exception Handling]
        I[Logging (SLF4J/Logback)]
        J[Validation (@Valid)]
    end

    G -- Authorizes/Authenticates --> B
    H -- Catches Exceptions --> B
    J -- Validates Input --> B
```

*   **Controller Layer (`com.alx.ecommerce.controller`):**
    *   Handles incoming HTTP requests.
    *   Maps requests to appropriate service methods.
    *   Performs input validation using `@Valid`.
    *   Returns HTTP responses (JSON).
    *   Leverages Spring Security annotations (`@PreAuthorize`) for endpoint-level authorization.
*   **Service Layer (`com.alx.ecommerce.service`):**
    *   Contains the core business logic.
    *   Orchestrates operations across multiple repositories.
    *   Applies transaction management (`@Transactional`).
    *   Manages caching using Spring's `@Cacheable`, `@CachePut`, `@CacheEvict`.
    *   Performs data transformations between DTOs and entities.
    *   Handles business rule validation and throws custom exceptions.
*   **Repository Layer (`com.alx.ecommerce.repository`):**
    *   Interacts directly with the database.
    *   Uses Spring Data JPA to define data access methods.
    *   Provides CRUD operations for entities.
    *   Includes custom queries for optimized data retrieval (e.g., `findByIdWithCategory`).
*   **Model Layer (`com.alx.ecommerce.model`):**
    *   Defines the JPA entities that represent the domain objects and map to database tables.
    *   Includes relationships (e.g., `@OneToMany`, `@ManyToOne`, `@ManyToMany`).
    *   Uses Lombok for boilerplate code reduction.
*   **DTO Layer (`com.alx.ecommerce.dto`):**
    *   Data Transfer Objects for transferring data between the client and controller, and between layers.
    *   Separates internal entity structure from external API representation.
    *   Used for request bodies and response payloads.
*   **Security Layer (`com.alx.ecommerce.security` & `com.alx.ecommerce.config.SecurityConfig`):**
    *   **Spring Security:** Provides authentication and authorization framework.
    *   **JWT (JSON Web Tokens):** Used for stateless authentication. `JwtTokenProvider` handles token generation and validation. `JwtAuthenticationFilter` intercepts requests to validate tokens. `JwtAuthenticationEntryPoint` handles unauthorized access.
*   **Configuration Layer (`com.alx.ecommerce.config`):**
    *   Contains Spring configurations for security, caching, OpenAPI, CORS, etc.
*   **Exception Layer (`com.alx.ecommerce.exception`):**
    *   Custom exception classes (e.g., `ResourceNotFoundException`, `CustomAuthenticationException`).
    *   `GlobalExceptionHandler` (`@ControllerAdvice`) provides centralized handling of exceptions, converting them into consistent, user-friendly API error responses.
*   **Utility Layer (`com.alx.ecommerce.util`):**
    *   General utility classes and constants (`AppConstants`).

## 3. Data Flow

1.  **Client Request:** A client (e.g., web browser) sends an HTTP request (e.g., `POST /api/v1/auth/login`, `GET /api/v1/products`).
2.  **API Gateway/Load Balancer:** (If present) Forwards the request to the backend service.
3.  **Spring Security Filter Chain:**
    *   `JwtAuthenticationFilter` intercepts the request.
    *   If a JWT token is present in the `Authorization` header, it's validated.
    *   If valid, the user's authentication context is set in `SecurityContextHolder`.
    *   If invalid or missing for a protected resource, `JwtAuthenticationEntryPoint` is triggered, returning a 401 Unauthorized.
4.  **Controller:**
    *   The request reaches the appropriate `@RestController` method.
    *   Input `DTO`s are validated using `@Valid`. If validation fails, `GlobalExceptionHandler` returns a 400 Bad Request.
    *   `@PreAuthorize` annotations are checked to ensure the authenticated user has the necessary roles/permissions. If not, a 403 Forbidden is returned.
    *   The controller calls a method in the `Service Layer`.
5.  **Service:**
    *   Executes business logic.
    *   Checks cache (`@Cacheable`). If data is present, it's returned directly.
    *   If not cached, calls one or more `Repository` methods to interact with the database.
    *   Performs additional business validations.
    *   Transforms `Entity` objects from the repository into `DTO`s for the controller.
    *   Updates cache (`@CachePut`, `@CacheEvict`) if data is modified.
6.  **Repository:**
    *   Executes JPA queries (either derived from method names or custom `@Query` annotations).
    *   Retrieves or persists data from/to PostgreSQL.
7.  **Response:** The service returns a `DTO` to the controller, which then formats it into a JSON HTTP response and sends it back to the client.

## 4. Database Schema (PostgreSQL)

The database schema is defined using SQL migration scripts managed by Flyway. Key tables include:

*   **`users`**: Stores user authentication and profile information.
*   **`roles`**: Defines user roles (e.g., `ROLE_USER`, `ROLE_ADMIN`).
*   **`user_roles`**: Junction table for many-to-many relationship between users and roles.
*   **`categories`**: Stores product categories.
*   **`products`**: Stores product details, linked to `categories`.
*   **`reviews`**: Stores user reviews for products, linked to `users` and `products`.
*   **`orders`**: Stores order information, linked to `users`.
*   **`order_items`**: Stores individual items within an order, linking `orders` to `products`.

## 5. Scalability and Performance Considerations

*   **Stateless Backend:** JWT-based authentication makes the backend stateless, enabling easy horizontal scaling by adding more application instances behind a load balancer.
*   **Caching (Caffeine):** Reduces database load and latency for read-heavy operations. For distributed caching across multiple instances, Caffeine would be replaced or augmented with an external cache like Redis.
*   **Database Indexing:** Proper indexing (as seen in `V1__Initial_Schema.sql`) is crucial for query performance.
*   **Pagination & Sorting:** All list endpoints support pagination and sorting to prevent large data transfers and improve responsiveness.
*   **Lazy Loading & Fetching Strategies:** JPA `FetchType.LAZY` is used by default to avoid loading unnecessary related data. Custom `@Query` with `JOIN FETCH` is used where eager loading is beneficial to prevent N+1 query problems.
*   **Asynchronous Operations (`@EnableAsync`):** The application is configured to support asynchronous tasks, which can be used for non-critical operations like sending email notifications or processing image uploads in the background, freeing up request threads.
*   **Rate Limiting (Conceptual):** Essential for protecting APIs from abuse. Can be implemented at the API Gateway level (Nginx, cloud gateway) or within the application using libraries like Bucket4j.

## 6. Security Considerations

*   **Authentication:** Strong password hashing (BCrypt) and JWT for token-based authentication.
*   **Authorization:** Role-Based Access Control using Spring Security's `@PreAuthorize` annotations.
*   **Input Validation:** `@Valid` annotations on DTOs prevent common injection attacks and ensure data integrity.
*   **Error Handling:** Generic error messages prevent information leakage.
*   **CORS:** Configured to allow only trusted frontend origins.
*   **Secrets Management:** Sensitive information (JWT secret, DB passwords) is expected to be managed via environment variables or secret management tools in production, not hardcoded.
*   **HTTPS:** Mandatory for production to protect data in transit.

## 7. Future Enhancements

*   **Frontend Application:** Develop a rich UI using React/Angular/Vue.js.
*   **Payment Gateway Integration:** Implement integration with Stripe, PayPal, etc.
*   **Email Service:** Send order confirmations, shipping updates, etc.
*   **Search Engine:** Integrate with Elasticsearch or Apache Solr for advanced product search.
*   **Shopping Cart:** Implement a persistent shopping cart functionality.
*   **Image Uploads:** Integrate with cloud storage (AWS S3, Google Cloud Storage) for product images.
*   **Distributed Caching:** Replace or augment Caffeine with Redis for a clustered environment.
*   **Message Queues:** Integrate Kafka or RabbitMQ for asynchronous processing (e.g., order processing, inventory updates).
*   **Admin Dashboard:** A dedicated interface for administrators to manage products, users, orders, etc.
*   **GraphQL API:** Provide an alternative API for more flexible data fetching.

This architecture provides a solid foundation for a scalable and maintainable e-commerce application, adhering to modern software engineering best practices.
```

**API_DOCS.md**

```markdown