# Architecture Documentation - Secure Auth System

This document provides a detailed overview of the architectural design and principles behind the Secure Auth System.

## Table of Contents

1.  [Overview](#1-overview)
2.  [Architectural Style](#2-architectural-style)
3.  [Layered Architecture](#3-layered-architecture)
    *   [Presentation Layer](#31-presentation-layer-controllers)
    *   [Service Layer](#32-service-layer-services)
    *   [Persistence Layer](#33-persistence-layer-repositories)
    *   [Domain Layer](#34-domain-layer-models)
    *   [Security Layer](#35-security-layer)
    *   [Infrastructure Layer](#36-infrastructure-layer)
4.  [Technology Stack](#4-technology-stack)
5.  [Key Design Decisions & Patterns](#5-key-design-decisions--patterns)
    *   [API Design (RESTful)](#51-api-design-restful)
    *   [Authentication (JWT)](#52-authentication-jwt)
    *   [Authorization (RBAC with Spring Security)](#53-authorization-rbac-with-spring-security)
    *   [Database Management (Flyway)](#54-database-management-flyway)
    *   [Data Transfer Objects (DTOs)](#55-data-transfer-objects-dtos)
    *   [Centralized Error Handling](#56-centralized-error-handling)
    *   [Caching (Caffeine)](#57-caching-caffeine)
    *   [Rate Limiting (Guava RateLimiter)](#58-rate-limiting-guava-ratelimiter)
    *   [Logging](#59-logging)
6.  [Scalability & Performance Considerations](#6-scalability--performance-considerations)
7.  [Security Considerations](#7-security-considerations)
8.  [Deployment Diagram](#8-deployment-diagram)

---

## 1. Overview

The Secure Auth System is a backend service designed to provide robust authentication and authorization capabilities for various client applications (web, mobile, other services). It's built as a monolithic Spring Boot application, optimized for ease of deployment, maintainability, and enterprise-grade features.

## 2. Architectural Style

The system adopts a **monolithic architecture** for simplicity and cohesion, making it easier to develop and deploy as a single unit. Within this monolith, a **layered architecture** pattern is strictly followed to ensure separation of concerns, modularity, and maintainability.

## 3. Layered Architecture

The application is structured into distinct logical layers, with clear responsibilities and dependencies. Each layer typically communicates only with the layers immediately above or below it.

```
+------------------------------------+
| 3.1 Presentation Layer (Controllers) |
|      (Spring MVC, API Endpoints)   |
+------------------------------------+
           | Requests
           v
+------------------------------------+
|   3.2 Service Layer (Services)     |
|    (Business Logic, Transactions)  |
+------------------------------------+
           | Orchestration
           v
+------------------------------------+
| 3.3 Persistence Layer (Repositories)|
|        (Spring Data JPA)           |
+------------------------------------+
           | Data Access
           v
+------------------------------------+
|     3.4 Domain Layer (Models)      |
|    (JPA Entities: User, Role)      |
+------------------------------------+

+------------------------------------+
|   3.5 Security Layer               |
|  (Spring Security, JWT Filters)    |  <-- Cross-cutting concern affecting all layers
+------------------------------------+

+------------------------------------+
|   3.6 Infrastructure Layer         |
| (Config, Utils, Exception Handling, |
|    Caching, Rate Limiting)         |  <-- Cross-cutting concerns & shared components
+------------------------------------+
```

### 3.1. Presentation Layer (Controllers)

*   **Responsibilities:**
    *   Receiving HTTP requests from clients.
    *   Validating request parameters and body using `jakarta.validation` annotations.
    *   Delegating business logic execution to the Service Layer.
    *   Transforming data from DTOs (Data Transfer Objects) to domain models and vice-versa.
    *   Constructing and returning standardized API responses (including error responses).
*   **Technologies:** Spring MVC (`@RestController`, `@RequestMapping`).
*   **Components:** `AuthController`, `UserController`, `RoleController`.

### 3.2. Service Layer (Services)

*   **Responsibilities:**
    *   Encapsulating core business logic and workflows.
    *   Applying business rules and validations (e.g., username/email uniqueness).
    *   Orchestrating interactions between multiple repositories and other services.
    *   Managing transactions (`@Transactional`).
    *   Implementing caching logic.
*   **Technologies:** Spring (`@Service`, `@Transactional`).
*   **Components:** `AuthService`, `UserService`, `RoleService`.

### 3.3. Persistence Layer (Repositories)

*   **Responsibilities:**
    *   Providing an abstraction over the database.
    *   Performing CRUD (Create, Read, Update, Delete) operations on domain models.
    *   Defining custom query methods.
*   **Technologies:** Spring Data JPA, Hibernate.
*   **Components:** `UserRepository`, `RoleRepository`.

### 3.4. Domain Layer (Models)

*   **Responsibilities:**
    *   Representing the core business entities and their relationships.
    *   Defining data structure and constraints.
    *   Implementing `UserDetails` for Spring Security integration.
*   **Technologies:** JPA (`@Entity`, `@Table`, `@Id`, `@GeneratedValue`, `@Column`, `@ManyToMany`, `@JoinTable`).
*   **Components:** `User`, `Role`.

### 3.5. Security Layer

*   **Responsibilities:**
    *   **Authentication:** Verifying the identity of users (login, JWT validation).
    *   **Authorization:** Determining if an authenticated user has permission to perform a specific action or access a resource (role-based access control).
    *   Password encoding.
*   **Technologies:** Spring Security, JWT (JJWT library), BCrypt.
*   **Components:** `SecurityConfig`, `JwtAuthenticationFilter`, `JwtService`, `UserDetailsService` (implemented implicitly by `User` entity and `UserRepository`).

### 3.6. Infrastructure Layer

*   **Responsibilities:**
    *   **Configuration:** Externalizing application settings (`application.yml`).
    *   **Utilities:** Shared helper classes (e.g., `RoleEnum`).
    *   **Exception Handling:** Providing a consistent mechanism for handling exceptions globally (`GlobalExceptionHandler`).
    *   **Caching:** Integrating and configuring caching mechanisms (`CachingConfig`).
    *   **Rate Limiting:** Implementing request rate control (`RateLimitInterceptor`, `RateLimitingConfig`).
    *   **API Documentation:** Generating OpenAPI specifications (`OpenApiConfig`).
    *   **Logging:** Centralized logging with Logback (`logback-spring.xml`).
*   **Technologies:** Spring (`@Configuration`, `@ControllerAdvice`), Guava RateLimiter, Logback.

## 4. Technology Stack

*   **Backend Framework:** Spring Boot 3.x (Java 17)
*   **Build Tool:** Maven
*   **Database:** PostgreSQL 15
*   **ORM:** Spring Data JPA / Hibernate
*   **Authentication/Authorization:** Spring Security, JWT (JJWT)
*   **Database Migration:** Flyway
*   **Caching:** Caffeine
*   **Rate Limiting:** Google Guava RateLimiter
*   **Validation:** Jakarta Bean Validation
*   **API Documentation:** Springdoc-openapi (Swagger UI)
*   **Logging:** SLF4J with Logback
*   **Utility Library:** Lombok
*   **Containerization:** Docker, Docker Compose
*   **CI/CD:** GitHub Actions
*   **Testing:** JUnit 5, Mockito, Spring Boot Test, Testcontainers, JaCoCo

## 5. Key Design Decisions & Patterns

### 5.1. API Design (RESTful)

*   **Resource-Oriented:** APIs are designed around resources (e.g., `/users`, `/roles`).
*   **Standard HTTP Methods:** Uses GET, POST, PUT, DELETE for CRUD operations.
*   **Stateless:** No session state maintained on the server for user authentication (handled by JWT).
*   **JSON Format:** Request and response bodies are JSON.
*   **Standardized Responses:** All API responses adhere to a consistent `ApiResponse` structure, including error responses.

### 5.2. Authentication (JWT)

*   **Token-Based:** JSON Web Tokens (JWTs) are used for authentication.
*   **Stateless:** The server does not store session information. Each request with a valid JWT is considered authenticated.
*   **`JwtService`:** Handles JWT creation, parsing, and validation.
*   **`JwtAuthenticationFilter`:** Intercepts incoming requests to validate JWTs and set Spring Security's authentication context.

### 5.3. Authorization (RBAC with Spring Security)

*   **Role-Based Access Control (RBAC):** Users are assigned roles (e.g., `ROLE_USER`, `ROLE_ADMIN`), and access to resources/endpoints is granted based on these roles.
*   **`@PreAuthorize`:** Used at the method level in controllers to enforce granular access rules.
*   **`SecurityConfig`:** Configures URL-based authorization rules and sets up the security filter chain.
*   **Custom `UserDetailsService`:** Loads user details (including roles) from the database for Spring Security.

### 5.4. Database Management (Flyway)

*   **Version Control for Database:** Flyway manages database schema evolution, ensuring that changes are applied consistently across environments.
*   **SQL-Based Migrations:** Schema changes are defined in SQL scripts, making them explicit and database-agnostic.
*   **Seed Data:** Initial roles and an admin user are populated via Flyway migration scripts.

### 5.5. Data Transfer Objects (DTOs)

*   **Separation of Concerns:** DTOs (`RegisterRequest`, `UserDto`, `RoleDto` etc.) are used to decouple the API contract from the internal domain model.
*   **Input Validation:** DTOs are annotated with `jakarta.validation` constraints for automatic input validation.
*   **Data Transformation:** Conversion between DTOs and domain entities is handled in service layers.

### 5.6. Centralized Error Handling

*   **`GlobalExceptionHandler`:** A `@ControllerAdvice` class centrally handles various exceptions (e.g., `ResourceNotFoundException`, `ValidationException`, `MethodArgumentNotValidException`, Spring Security exceptions).
*   **Consistent Error Responses:** All error responses follow the `ApiResponse` structure, providing clear status, message, and an optional error code.

### 5.7. Caching (Caffeine)

*   **In-Memory Cache:** Caffeine is used for fast, local caching of frequently accessed data (e.g., `User` and `Role` details).
*   **Spring Cache Abstraction:** `@Cacheable`, `@CachePut`, `@CacheEvict` annotations are used for declarative caching.
*   **Performance Improvement:** Reduces database load and improves response times for read-heavy operations.

### 5.8. Rate Limiting (Guava RateLimiter)

*   **Security Measure:** Implemented as a `HandlerInterceptor` to control the rate of requests to sensitive endpoints (e.g., `/api/auth/login`, `/api/auth/register`).
*   **Brute-Force Protection:** Prevents attackers from making too many authentication attempts in a short period from a single IP address.
*   **In-Memory per IP:** Simple, effective for a single instance. For distributed systems, a shared cache (Redis) would be needed.

### 5.9. Logging

*   **Structured Logging:** Configured with Logback to output structured logs (timestamp, thread, level, logger, message).
*   **File and Console Output:** Logs are written to both the console and daily rolling files (`application-info.log`, `application-error.log`).
*   **Granular Control:** Log levels can be adjusted per package in `logback-spring.xml` and `application.yml` for detailed debugging or production monitoring.

## 6. Scalability & Performance Considerations

*   **Stateless API (JWT):** Makes the application easier to scale horizontally, as any instance can handle any client request without relying on session stickiness.
*   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding) as needed.
*   **Caching:** Reduces database load, improving overall system responsiveness and throughput.
*   **Rate Limiting:** Protects against abuse and helps maintain stability under high traffic.
*   **Connection Pooling (HikariCP):** Optimized database connection management.
*   **Asynchronous Processing:** For operations not directly tied to immediate API responses, asynchronous processing (e.g., Spring's `@Async`, message queues) could be introduced.
*   **Load Balancing:** Deploying multiple instances behind a load balancer (e.g., Nginx, AWS ELB) is straightforward due to statelessness.

## 7. Security Considerations

*   **Password Hashing:** Uses strong, industry-standard BCrypt for password storage.
*   **JWT Security:**
    *   Uses HMAC-SHA256 for token signing.
    *   Tokens have a defined expiration time.
    *   Secret key is stored securely (environment variable).
*   **Input Validation:** Prevents common injection attacks (SQL, XSS) and ensures data integrity.
*   **Access Control:** Strict RBAC implemented via Spring Security.
*   **Secure Defaults:** Spring Security's default protections (e.g., against common vulnerabilities) are leveraged.
*   **Error Handling:** Generic error messages prevent information leakage.
*   **Rate Limiting:** Mitigates brute-force and denial-of-service attacks on authentication endpoints.
*   **HTTPS:** Assumed to be enforced at the infrastructure level (e.g., load balancer, API Gateway) in a production environment to protect JWTs in transit.
*   **Secrets Management:** Sensitive information (JWT secret, DB credentials) is managed via environment variables and should be handled by secure vault solutions (e.g., HashiCorp Vault, AWS Secrets Manager) in production.
*   **Dependencies:** Regular vulnerability scanning of dependencies (e.g., Snyk, OWASP Dependency-Check) is crucial.

## 8. Deployment Diagram

This diagram illustrates a typical production deployment for the Secure Auth System.

```mermaid
graph TD
    subgraph Client Applications
        A[Web Browser]
        B[Mobile App]
        C[Other Services]
    end

    subgraph Internet / Edge Network
        D(Load Balancer / API Gateway)
    end

    subgraph Cloud / On-Premise Infrastructure
        subgraph Application Cluster
            E[Secure Auth System (Instance 1)]
            F[Secure Auth System (Instance 2)]
            G[Secure Auth System (Instance N)]
            style E fill:#f9f,stroke:#333,stroke-width:2px;
            style F fill:#f9f,stroke:#333,stroke-width:2px;
            style G fill:#f9f,stroke:#333,stroke-width:2px;
        end
        H[PostgreSQL Database]
        I[Caching Layer (e.g., Redis)]
        J[Monitoring & Logging (e.g., Prometheus, Grafana, ELK)]
        K[Secret Management (e.g., Vault)]
    end

    A -- HTTP/S --> D
    B -- HTTP/S --> D
    C -- HTTP/S --> D

    D -- Load Balance --> E
    D -- Load Balance --> F
    D -- Load Balance --> G

    E -- DB Connection --> H
    F -- DB Connection --> H
    G -- DB Connection --> H

    E -- Cache Usage --> I
    F -- Cache Usage --> I
    G -- Cache Usage --> I

    E -- Logs/Metrics --> J
    F -- Logs/Metrics --> J
    G -- Logs/Metrics --> J

    E -- Access Secrets --> K
    F -- Access Secrets --> K
    G -- Access Secrets --> K

    style H fill:#a8d,stroke:#333,stroke-width:2px;
    style I fill:#fdf,stroke:#333,stroke-width:2px;
    style J fill:#ddf,stroke:#333,stroke-width:2px;
    style K fill:#ffd,stroke:#333,stroke-width:2px;

    classDef component fill:#fff,stroke:#333,stroke-width:1px;
    class A,B,C component;
    class D component;
    class E,F,G component;
    class H component;
    class I component;
    class J component;
    class K component;
```

**Notes on Deployment Diagram:**

*   **Load Balancer/API Gateway:** Distributes incoming traffic and often handles SSL termination, WAF, and additional rate limiting.
*   **Application Cluster:** Multiple instances of the Spring Boot application (Docker containers) running behind a load balancer for high availability and scalability.
*   **PostgreSQL Database:** Dedicated, persistent database instance. Can be a managed service (e.g., AWS RDS, Azure Database for PostgreSQL).
*   **Caching Layer (Optional but Recommended):** For enterprise-grade distributed caching, an external solution like Redis or Memcached would replace the in-memory Caffeine cache, ensuring cache consistency across application instances.
*   **Monitoring & Logging:** Centralized systems for collecting logs and metrics from all application instances (e.g., ELK stack, Grafana + Prometheus, cloud-native solutions).
*   **Secret Management:** A dedicated service to securely store and provide access to sensitive configurations (database credentials, JWT secret keys).

---
```

#### `API.md`

```markdown