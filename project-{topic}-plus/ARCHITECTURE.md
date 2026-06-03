```markdown
# Product Management System - Architecture Documentation

This document outlines the high-level architecture of the Product Management System, emphasizing its components and their interactions within a DevOps automation context.

## 1. Overview

The Product Management System is designed as a modular, layered Spring Boot application, containerized using Docker, and integrated with a comprehensive DevOps ecosystem. It aims for maintainability, scalability, and observability, crucial aspects for enterprise-grade applications.

## 2. Component Diagram

```mermaid
graph TD
    subgraph Clients
        FE[Web Browser / Postman] --> |HTTP/HTTPS| NginxGateway(Nginx / API Gateway)
    end

    subgraph Infrastructure (Docker Compose / Kubernetes)
        NginxGateway --> |Proxy / Load Balance| AppService(Spring Boot App)
        AppService --> |JDBC / JPA| DB(PostgreSQL Database)

        subgraph Monitoring
            AppService -- Metrics (Actuator) --> Prometheus[Prometheus]
            Prometheus --> Grafana[Grafana]
        end
    end

    subgraph DevOps Tooling
        Developer[Developer] -- Code --> GitRepo(GitHub Repository)
        GitRepo -- Webhook / Push --> CICD[GitHub Actions]
        CICD -- Build & Test --> BuildEnv(Maven/JDK)
        CICD -- Unit/Integration/API Tests --> TestDB(Testcontainers / PostgreSQL)
        CICD -- Build Docker Image --> DockerBuildEnv(Docker Daemon)
        CICD -- Push Image --> DockerRegistry[Docker Hub]
        CICD -- Deploy (Simulation/Script) --> ProductionEnv(Cloud VM / Kubernetes)
    end

    style AppService fill:#f9f,stroke:#333,stroke-width:2px
    style DB fill:#afa,stroke:#333,stroke-width:2px
    style Prometheus fill:#ffc,stroke:#333,stroke-width:2px
    style Grafana fill:#ccf,stroke:#333,stroke-width:2px
    style NginxGateway fill:#eed,stroke:#333,stroke-width:2px
```

## 3. Core Application Architecture (Spring Boot Backend)

The Spring Boot application follows a traditional N-tier architecture:

*   **Controller Layer (`com.alx.pm.controller`):**
    *   Handles incoming HTTP requests and routes them to appropriate service methods.
    *   Performs input validation (using JSR-303 annotations).
    *   Applies rate limiting (`Bucket4j`).
    *   Utilizes Spring Security for authentication and authorization.
    *   Exposes endpoints for Product, Category, and Authentication operations.
    *   Integrated with SpringDoc OpenAPI for Swagger UI generation.

*   **Service Layer (`com.alx.pm.service`):**
    *   Contains the core business logic.
    *   Acts as an intermediary between controllers and repositories.
    *   Orchestrates data operations and applies domain rules.
    *   Includes transaction management (`@Transactional`).
    *   Leverages Spring Cache (`@Cacheable`, `@CacheEvict`) for performance optimization.
    *   Handles security-related logic (e.g., `AuthService`, `UserDetailsServiceImpl`).

*   **Repository Layer (`com.alx.pm.repository`):**
    *   Interacts directly with the database using Spring Data JPA.
    *   Provides CRUD operations and custom queries for `Product`, `Category`, `User`, `Role` entities.

*   **Entity Layer (`com.alx.pm.entity`):**
    *   Defines the persistence model (JPA entities) for `Product`, `Category`, `User`, `Role`.
    *   Includes auditing fields (`@CreatedDate`, `@LastModifiedDate`).

*   **DTO Layer (`com.alx.pm.dto`):**
    *   Data Transfer Objects for transferring data between the client and controller, and sometimes between layers.
    *   Decouples the internal entity structure from the API contract.

*   **Security Layer (`com.alx.pm.security`):**
    *   Implements JWT-based authentication using Spring Security.
    *   Includes `JwtAuthenticationFilter`, `JwtAuthenticationEntryPoint`, `UserDetailsServiceImpl`, and `JwtUtil`.

*   **Configuration (`com.alx.pm.config`):**
    *   Configures Spring Security, caching, and other application-wide settings.

*   **Exception Handling (`com.alx.pm.exception`):**
    *   Global exception handler (`@ControllerAdvice`) to provide consistent error responses (e.g., `ResourceNotFoundException`, `ApiException`, validation errors).

## 4. Database Design

*   **PostgreSQL:** Chosen for its robustness, reliability, and enterprise features.
*   **Flyway:** Used for declarative database schema migration. Migrations are SQL scripts (`V1__Initial_Schema.sql`, `V2__Seed_Data.sql`) ensuring controlled and repeatable schema changes.
*   **Schema:**
    *   `categories`: Stores product categories.
    *   `products`: Stores product details, with a foreign key to `categories`.
    *   `users`: Stores user authentication details.
    *   `roles`: Stores user roles (e.g., `ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN`).
    *   `user_roles`: A join table for many-to-many relationship between users and roles.
*   **Query Optimization:** Includes indexes on foreign keys and frequently queried columns (`products.category_id`, `products.name`, `users.username`, `users.email`).

## 5. DevOps Toolchain

The following tools are integrated into the DevOps lifecycle:

*   **Version Control:** Git & GitHub
*   **Build Automation:** Maven
*   **Dependency Management:** Maven Central, Local Maven Repository
*   **Containerization:** Docker
*   **Container Orchestration (Local):** Docker Compose
*   **CI/CD:** GitHub Actions (Build, Test, Push to Docker Hub, Simulate Deploy)
*   **Database Migration:** Flyway
*   **Code Quality & Testing:** JUnit 5, Mockito, JaCoCo (Code Coverage)
*   **API Documentation:** SpringDoc OpenAPI (Swagger UI)
*   **Logging:** SLF4J + Logback (Structured, configurable logging)
*   **Monitoring:**
    *   **Spring Boot Actuator:** Exposes application metrics.
    *   **Prometheus:** Time-series database for collecting metrics.
    *   **Grafana:** Visualization and dashboarding of metrics from Prometheus.
*   **Database Management (GUI):** Adminer (for local development/inspection).

## 6. Security Considerations

*   **Authentication:** JWT-based stateless authentication.
*   **Authorization:** Role-based access control (`@PreAuthorize`) for API endpoints.
*   **Password Storage:** Passwords are BCrypt hashed using `PasswordEncoder`.
*   **Secrets Management:** Environment variables are used for sensitive information (DB credentials, JWT secret). In production, these should be managed by dedicated secret management services (e.g., AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
*   **Input Validation:** JSR-303 annotations are used at the controller layer to prevent common injection attacks and ensure data integrity.
*   **Error Handling:** Global exception handling prevents sensitive information from being exposed in error responses.

## 7. Scalability & Resilience

*   **Stateless Application:** The use of JWTs makes the application stateless, allowing easy horizontal scaling of application instances.
*   **Caching:** Caffeine cache reduces database load for frequently accessed data.
*   **Rate Limiting:** Protects the API from abuse and ensures fair resource usage.
*   **Database:** PostgreSQL supports replication and clustering for high availability and read scalability.
*   **Containerization:** Docker facilitates easy scaling of services in container orchestration platforms like Kubernetes.
*   **Monitoring:** Prometheus and Grafana provide critical insights into performance bottlenecks and health issues, enabling proactive scaling and incident response.

This architecture provides a solid foundation for a robust, maintainable, and observable product management system ready for production deployment.
```