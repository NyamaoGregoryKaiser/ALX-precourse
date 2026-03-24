# Architecture Documentation: Product Management System

This document outlines the architecture of the Product Management System, focusing on its components, their interactions, data flow, and underlying technology choices.

## Table of Contents

1.  [High-Level Overview](#1-high-level-overview)
2.  [System Components](#2-system-components)
    *   [Frontend](#frontend)
    *   [Backend (Product Service)](#backend-product-service)
    *   [Database](#database)
3.  [Data Flow & Interaction](#3-data-flow--interaction)
    *   [User Authentication Flow](#user-authentication-flow)
    *   [CRUD Operation Flow (Example: Get Products)](#crud-operation-flow-example-get-products)
4.  [Technology Stack](#4-technology-stack)
5.  [Key Architectural Decisions & Principles](#5-key-architectural-decisions--principles)
6.  [Scalability & Reliability Considerations](#6-scalability--reliability-considerations)
7.  [Security Considerations](#7-security-considerations)

## 1. High-Level Overview

The Product Management System is a **monolithic Spring Boot application** providing a RESTful API, backed by a **PostgreSQL database**. A simple **HTML/JavaScript frontend** interacts with this API. The entire system is **containerized with Docker** and orchestrated using **Docker Compose** for local development and deployment. A **CI/CD pipeline (GitHub Actions)** automates the build, test, and deployment processes.

```
+------------------+     +------------------------+     +-------------------+
|     User (Browser) <--->|     Frontend           |     |                   |
|                  |     | (HTML/JS)              |     |                   |
+------------------+     +--------v---------------+     |                   |
                                  | HTTP/HTTPS             |                   |
                                  | (API Calls)            |                   |
+---------------------------------+------------------------+-----------------+
|                                 |                                           |
|       +------------------------------------+                                |
|       |   Backend (Product Service)        |                                |
|       |   (Java Spring Boot)               |                                |
|       |                                    |                                |
|       |  +-----------------------------+   |                                |
|       |  |  Controller Layer           |   |                                |
|       |  |  (REST API, Auth, RateLimit)|   |                                |
|       |  +--------------^--------------+   |                                |
|       |                 |                    |                                |
|       |  +--------------v--------------+   |                                |
|       |  |  Service Layer              |   |                                |
|       |  |  (Business Logic, Caching)  |   |                                |
|       |  +--------------^--------------+   |                                |
|       |                 |                    |                                |
|       |  +--------------v--------------+   |                                |
|       |  |  Repository Layer           |   |                                |
|       |  |  (Spring Data JPA)          |   |                                |
|       |  +--------------^--------------+   |                                |
|       +-----------------|--------------------+                                |
|                         | JDBC                                              |
|                         |                                                   |
|       +-----------------v-----------------+                                 |
|       |          Database             |                                 |
|       |          (PostgreSQL)         |                                 |
|       |          (Flyway Migrations)  |                                 |
|       +---------------------------------+                                 |
|                                                                           |
+---------------------------------------------------------------------------+
               (Containerized via Docker & Docker Compose)
```

## 2. System Components

### Frontend
*   **Technology:** Vanilla HTML, CSS, JavaScript.
*   **Purpose:** Provides a basic user interface for interacting with the backend API.
*   **Functionality:**
    *   User registration and login.
    *   Displaying lists of products and categories.
    *   Forms for creating, updating, and deleting products and categories (admin-only).
    *   Basic client-side error/success message display.
*   **Deployment:** Served directly by the Spring Boot application as static content.

### Backend (Product Service)
*   **Technology:** Java 17, Spring Boot 3.x, Maven.
*   **Architecture:** Layered (Controller, Service, Repository).
*   **Core Modules:**
    *   **`com.alx.devops.model`:** JPA Entities (`Product`, `Category`, `User`, `Role`) defining the data structure.
    *   **`com.alx.devops.repository`:** Spring Data JPA repositories (`ProductRepository`, `CategoryRepository`, `UserRepository`) for data access abstraction.
    *   **`com.alx.devops.service`:** Contains business logic for CRUD operations, validation, and domain-specific rules (`ProductService`, `CategoryService`, `AuthService`).
    *   **`com.alx.devops.controller`:** RESTful API endpoints (`ProductController`, `CategoryController`, `AuthController`) for handling HTTP requests.
    *   **`com.alx.devops.dto`:** Data Transfer Objects (`ProductDTO`, `CategoryDTO`, `AuthRequest`, `AuthResponse`) for request/response serialization.
    *   **`com.alx.devops.config`:** Configuration classes (`SecurityConfig`, `CacheConfig`, `RateLimitingInterceptor`, `GlobalExceptionHandler`) for security, caching, rate limiting, and error handling.
*   **Key Features:**
    *   **RESTful API:** Standard HTTP methods (GET, POST, PUT, DELETE).
    *   **Authentication & Authorization:** JWT-based using Spring Security for secure API access and role-based permissions (`ROLE_USER`, `ROLE_ADMIN`).
    *   **Data Validation:** `jakarta.validation` annotations for input validation.
    *   **Caching:** Spring's caching abstraction with Caffeine (in-memory) to reduce database load for read-heavy operations.
    *   **Rate Limiting:** Custom `HandlerInterceptor` to protect against API abuse.
    *   **Global Error Handling:** `@ControllerAdvice` for consistent error responses.
    *   **Logging:** Configured with Logback for detailed application insights.
    *   **Monitoring:** Spring Boot Actuator endpoints expose health, metrics, and Prometheus compatibility.

### Database
*   **Technology:** PostgreSQL.
*   **Purpose:** Relational database for persistent storage of product, category, user, and role data.
*   **Schema:** Defined by JPA entities and managed by Flyway migration scripts (`V1__Initial_Schema.sql`, `V2__Seed_Data.sql`).
*   **Migration:** Flyway ensures version-controlled and automated schema evolution.
*   **Query Optimization:** Includes basic indexing (e.g., `idx_products_name`, `idx_products_category_id`). Further optimization would involve analyzing query plans and adding more specific indexes as needed.

## 3. Data Flow & Interaction

### User Authentication Flow
1.  **User (Frontend):** Submits username/password to `/api/auth/login`.
2.  **Product Service (AuthController):** Receives credentials.
3.  **AuthService:** Calls Spring Security's `AuthenticationManager` to authenticate.
4.  **CustomUserDetailsService:** Loads user details from `UserRepository`.
5.  **AuthService:** Upon successful authentication, `JwtTokenProvider` generates a JWT.
6.  **Product Service (AuthController):** Returns the JWT to the Frontend.
7.  **User (Frontend):** Stores the JWT (e.g., in `localStorage`) and includes it in `Authorization: Bearer <token>` header for subsequent protected requests.
8.  **Product Service (JwtAuthFilter):** Intercepts incoming requests, validates the JWT, and sets up Spring Security context.

### CRUD Operation Flow (Example: Get Products)
1.  **User (Frontend):** Sends GET request to `/api/products` with JWT in header.
2.  **Product Service (JwtAuthFilter):** Validates JWT. If valid and authorized, request proceeds.
3.  **Product Service (RateLimitingInterceptor):** Checks if the request exceeds rate limits. If so, returns 429.
4.  **Product Service (ProductController):** Receives the request.
5.  **ProductService:**
    *   Checks if products are in **Caffeine cache**.
    *   If found, returns cached data (cache hit).
    *   If not found (cache miss), `ProductRepository` is called.
6.  **ProductRepository:** Executes JPA query to fetch data from PostgreSQL.
7.  **Database (PostgreSQL):** Returns product data.
8.  **ProductService:** Maps JPA entities to `ProductDTO`s. If it was a cache miss, the results are stored in cache before returning.
9.  **Product Service (ProductController):** Returns `List<ProductDTO>` to the Frontend.
10. **User (Frontend):** Displays the product list.

## 4. Technology Stack

(Refer to `README.md` for the full technology stack.)

## 5. Key Architectural Decisions & Principles

*   **Monolithic Architecture:** Chosen for simplicity and ease of initial development and deployment for this demonstration project. For larger, more complex systems, a microservices architecture would be considered.
*   **Layered Architecture:** Clear separation of concerns (Controller, Service, Repository) for maintainability, testability, and modularity.
*   **RESTful API Design:** Adherence to REST principles for stateless, resource-oriented interactions.
*   **Database-First for Schema:** While JPA handles object-relational mapping, Flyway is used for explicit, version-controlled database schema management, giving developers control over schema evolution.
*   **Spring Security for Enterprise-Grade Security:** Leveraging a mature framework for authentication and authorization.
*   **Caching for Performance:** Strategic use of in-memory caching to improve response times and reduce database load.
*   **Containerization:** Docker provides environment consistency from development to production.
*   **Automated Testing:** Emphasis on comprehensive unit, integration, and API tests to ensure quality and enable rapid iteration.
*   **CI/CD:** Automating the build, test, and deployment process to accelerate delivery and reduce human error.

## 6. Scalability & Reliability Considerations

*   **Scalability:**
    *   **Horizontal Scaling (Application):** The Spring Boot application is stateless (due to JWT), allowing easy horizontal scaling by running multiple instances behind a load balancer.
    *   **Database Scaling:** PostgreSQL can be scaled vertically (more powerful server) or horizontally (read replicas, sharding, though more complex).
    *   **Caching:** Caffeine provides in-memory caching for a single application instance. For distributed caching across multiple instances, solutions like Redis would be integrated.
*   **Reliability:**
    *   **Database Persistence:** Docker volumes ensure data persistence for the PostgreSQL container.
    *   **Health Checks:** Configured in Docker Compose and Spring Boot Actuator to monitor service health.
    *   **Error Handling:** Robust global error handling prevents application crashes from unhandled exceptions.
    *   **Logging:** Centralized logging can be achieved by sending logs to an external system (e.g., ELK stack) for analysis and debugging.
    *   **Automated Deployments:** CI/CD reduces manual errors during deployment, increasing reliability.

## 7. Security Considerations

*   **Authentication & Authorization:** JWT-based Spring Security ensures that only authenticated and authorized users can access resources.
*   **Password Hashing:** Passwords are never stored in plain text; `BCryptPasswordEncoder` is used.
*   **Input Validation:** `@Valid` annotations and service-level checks prevent common vulnerabilities like SQL injection and cross-site scripting (though XSS is more a frontend concern).
*   **Environment Variables for Secrets:** Database credentials and JWT secrets are externalized via `.env` and environment variables, avoiding hardcoding in the codebase. In production, these would be managed by a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault).
*   **Rate Limiting:** Mitigates brute-force attacks and denial-of-service attempts.
*   **HTTPS:** Although not explicitly configured in `docker-compose.yml`, production deployments would absolutely require HTTPS for all communication between the client and the backend to protect data in transit. This typically involves a reverse proxy (Nginx, API Gateway) handling SSL termination.
*   **Dependency Security:** Regular security scans of dependencies (e.g., using Snyk, OWASP Dependency-Check) would be integrated into the CI pipeline.