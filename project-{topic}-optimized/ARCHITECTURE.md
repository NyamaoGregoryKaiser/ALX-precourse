```markdown
# Real-time Chat Application - Architecture Document

## 1. Introduction

This document provides a high-level overview of the architecture for the Real-time Chat Application. It describes the main components, their interactions, and the technologies used to build a robust, scalable, and production-ready system.

## 2. System Overview

The chat application is designed as a monolithic (for simplicity and ease of deployment in this example) Spring Boot application that integrates both RESTful APIs and WebSocket messaging. It follows a layered architectural pattern to separate concerns and enhance maintainability.

![Architecture Diagram](https://mermaid.live/svg/graph TD
    A[Frontend Client: HTML/JS/CSS] -->|1. REST API Calls| B(Backend: Spring Boot Application)
    A -->|2. WebSocket Connection| C(WebSocket Server: Spring)
    B -->|3. Data Access (JPA)| D[Database: PostgreSQL]
    C -->|4. Send Messages to Broker| B
    B -->|5. Message Broker (STOMP)| C
    B -->|6. Cache (Caffeine)| E[Caching Layer]
    B -->|7. Metrics (Actuator)| F[Monitoring System: Prometheus/Grafana]
    B -->|8. Logging| G[Logging System: ELK Stack]

    subgraph Backend: Spring Boot Application
        B1[Controller Layer] <--> B2(Service Layer)
        B2 <--> B3(Repository Layer)
        B3 --> D
        B1 -.-> B4(Security Layer: JWT Auth)
        B1 -.-> B5(Rate Limiting)
        B2 -.-> E
        B6(Global Exception Handler) -- handles --> B1, B2
        B7(WebSocket Controller/Listener) <--> C
    end
)

*Self-generated Mermaid diagram. For actual rendering, use a tool or viewer.*

**Key Components:**
*   **Frontend Client**: A simple web application built with HTML, CSS, and JavaScript, leveraging SockJS and STOMP.js for real-time communication.
*   **Spring Boot Application (Backend)**: The core of the system, written in Java.
    *   **Controller Layer**: Exposes RESTful API endpoints for user management, chat room management, and message history retrieval.
    *   **Service Layer**: Contains the business logic, transaction management, caching, and interacts with the repository layer.
    *   **Repository Layer**: Handles data persistence using Spring Data JPA and interacts with the PostgreSQL database.
    *   **Security Layer**: Implemented with Spring Security and JWT for authentication and authorization.
    *   **WebSocket Server**: Part of the Spring Boot application, handles STOMP over WebSocket connections for real-time messaging.
    *   **Global Exception Handler**: Provides consistent error responses across all API endpoints.
    *   **Rate Limiting Interceptor**: Protects API endpoints from abuse.
*   **PostgreSQL Database**: The primary data store for all application data (users, rooms, messages).
*   **Caching Layer (Caffeine)**: An in-memory cache integrated with Spring's caching abstraction to reduce database load and improve response times for frequently accessed data.
*   **Monitoring System (Prometheus/Grafana)**: (Conceptual) Spring Boot Actuator exposes metrics that can be scraped by Prometheus and visualized in Grafana.
*   **Logging System (ELK Stack/Others)**: (Conceptual) Centralized logging solution to collect and analyze application logs.

## 3. Data Flow

1.  **User Authentication/Registration**:
    *   Frontend sends `POST /api/v1/auth/register` or `POST /api/v1/auth/login` to the backend.
    *   Backend validates credentials, authenticates/registers the user, and issues a JWT token.
    *   Frontend stores the JWT token for subsequent authenticated requests.

2.  **RESTful API Interactions**:
    *   Frontend sends authenticated HTTP requests (GET, POST, PUT, DELETE) to various `/api/v1/...` endpoints.
    *   The Security Layer intercepts requests, validates the JWT token, and enforces authorization rules.
    *   Controllers invoke Service Layer methods, which perform business logic, interact with the Repository Layer (and potentially the Caching Layer), and return data.
    *   Responses are returned to the frontend.

3.  **Real-time Messaging (WebSocket)**:
    *   Frontend establishes a WebSocket connection to `/ws/chat` using SockJS and STOMP.js. The JWT token is sent during the STOMP `CONNECT` frame for authentication.
    *   Once connected, the client can subscribe to specific chat room topics (e.g., `/topic/rooms/{roomId}`).
    *   When a user sends a message (`/app/chat.sendMessage`):
        *   The WebSocket endpoint receives the message, associates it with the authenticated user and specified room.
        *   The MessageService saves the message to the PostgreSQL database.
        *   The message is then broadcasted by the Spring messaging template to the relevant `/topic/rooms/{roomId}` destination.
        *   All clients subscribed to that topic receive the new message in real-time.

## 4. Key Architectural Decisions & Trade-offs

*   **Monolithic Structure**: For rapid development and simpler deployment of this comprehensive example, a monolithic Spring Boot application is chosen.
    *   **Pros**: Easier to develop, test, and deploy initially.
    *   **Cons**: Can become harder to scale horizontally for individual components; tightly coupled.
    *   **Alternative**: Microservices architecture for greater scalability and fault tolerance, but adds complexity in deployment, communication, and data consistency.

*   **Spring Security with JWT**: Standard, robust security mechanism.
    *   **Pros**: Stateless, scalable, widely supported.
    *   **Cons**: Requires careful handling of token storage client-side (e.g., local storage vs. http-only cookies), and token revocation can be complex without a blacklist.

*   **STOMP over WebSocket**: Provides a higher-level messaging protocol than raw WebSockets.
    *   **Pros**: Simplifies message routing, error handling, and subscription management.
    *   **Cons**: Adds a small overhead compared to raw WebSockets.

*   **Caffeine Cache (In-Memory)**: Fast, simple to integrate.
    *   **Pros**: Very low latency, easy to set up with Spring Cache.
    *   **Cons**: Not distributed (each app instance has its own cache), susceptible to data staleness in a clustered environment unless explicitly managed (e.g., with cache invalidation events or shorter TTLs).
    *   **Alternative**: Distributed cache like Redis for multi-instance deployments.

*   **Rate Limiting (Bucket4j with In-Memory)**: Basic protection.
    *   **Pros**: Prevents simple abuse patterns.
    *   **Cons**: In-memory `Bucket4j` is not distributed. Each instance of the app applies its own rate limit.
    *   **Alternative**: Integrate `Bucket4j` with Redis or use an API Gateway (like Spring Cloud Gateway) for distributed rate limiting.

*   **Database (PostgreSQL)**: Reliable, feature-rich relational database.
    *   **Pros**: ACID compliance, strong data integrity, good for structured data.
    *   **Cons**: Can be a bottleneck at extreme scale if not properly sharded or optimized.
    *   **Alternative**: NoSQL databases (e.g., Cassandra for chat history) for massive scale, but sacrifice relational benefits.

## 5. Scalability Considerations

*   **Backend**: Can be scaled horizontally by running multiple instances behind a load balancer. However, stateless nature of JWT helps, but in-memory caches and rate limiters would need to be externalized (e.g., to Redis) for truly consistent behavior across instances.
*   **WebSockets**: Spring's WebSocket support can be configured with external message brokers (e.g., RabbitMQ, Kafka) if multiple application instances need to share WebSocket messages, allowing for horizontal scaling of the WebSocket component.
*   **Database**: Vertical scaling initially, then horizontal scaling through sharding, replication, or migrating specific data to specialized databases.

## 6. Security Considerations

*   **Authentication & Authorization**: JWT tokens and Spring Security for secure access.
*   **Input Validation**: Jakarta Bean Validation annotations are used to prevent invalid data from reaching business logic and database.
*   **Password Hashing**: BCrypt is used for strong password hashing.
*   **Rate Limiting**: Protects against brute-force attacks and denial-of-service attempts.
*   **CORS**: Configured to allow necessary origins (can be restricted further in production).
*   **SQL Injection/XSS**: JPA prevents most SQL injection. Proper input sanitization on the frontend and backend is crucial for content like chat messages to prevent XSS.

## 7. Future Enhancements

*   **Distributed Caching**: Integrate Redis for a distributed caching layer and distributed rate limiting.
*   **External Message Broker**: Use RabbitMQ or Kafka for WebSocket message brokering in a clustered environment.
*   **User Presence**: Show online/offline status for users.
*   **Direct Messaging**: Enhance support for one-to-one direct messages.
*   **File Sharing**: Allow users to share images, videos, or documents.
*   **Notifications**: Push notifications for new messages.
*   **Enhanced Frontend**: Use a modern JavaScript framework (React, Vue, Angular) for a richer UI.
*   **Monitoring Dashboards**: Set up Grafana dashboards for metrics from Prometheus.
*   **Full-text Search**: Integrate Elasticsearch for searching chat messages.
```