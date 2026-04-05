```markdown
# PerformancePulse - Architecture Documentation

This document outlines the high-level architecture, design principles, and technology stack used in the PerformancePulse system.

## 1. System Overview

PerformancePulse is a distributed performance monitoring system designed to actively check external web services/URLs, collect performance metrics, store them, and provide a user interface for visualization and alert management.

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    A[Client - Browser/Frontend App] -- HTTP/HTTPS --> B[Load Balancer / NGINX Proxy]
    B --> C[Backend API (Node.js/Express)]
    C -- Reads/Writes --> D[PostgreSQL Database]
    C -- Caches/Stores Sessions --> E[Redis Cache]
    C -- Publishes Metrics --> F[Prometheus Exporter (Prom-client)]
    C -- Schedules Jobs --> G[Node-cron Scheduler]
    G -- Triggers Checks --> H[Monitoring Worker]
    H -- HTTP Requests --> I[External Monitored Service]

    F -- Scrapes Metrics --> J[Prometheus Server]
    J -- Queries Metrics --> K[Grafana Dashboard]

    subgraph Core System
        C
        D
        E
        F
        G
    end

    subgraph Observability Stack
        J
        K
    end
```

## 3. Component Breakdown

### 3.1. Frontend Application

*   **Technology:** React (with TypeScript), React Router, ApexCharts for visualization.
*   **Purpose:** Provides a user-friendly interface for:
    *   User authentication (login, registration).
    *   Project management (create, view, update, delete projects).
    *   Monitor configuration (add, edit, delete URLs/services to monitor).
    *   Real-time and historical metric visualization (response times, status codes, uptime).
    *   Alert management (configure thresholds, view active alerts).
*   **Communication:** Interacts with the Backend API exclusively via RESTful HTTP requests.

### 3.2. Backend API

*   **Technology:** Node.js, Express.js (with TypeScript), TypeORM.
*   **Purpose:** The central nervous system of PerformancePulse, handling all business logic and data persistence.
*   **Key Responsibilities:**
    *   **Authentication & Authorization:** JWT-based user authentication, role-based access control (admin/user).
    *   **CRUD Operations:** Manages users, projects, monitors, metrics, and alerts.
    *   **Monitor Scheduling:** Integrates a background job scheduler (`node-cron`) to periodically trigger monitoring tasks.
    *   **Metric Storage:** Persists collected performance metrics in the PostgreSQL database.
    *   **Caching:** Utilizes Redis for caching frequently accessed data (e.g., monitor lists, recent metrics) to reduce database load and improve response times.
    *   **Rate Limiting:** Protects API endpoints against abuse.
    *   **Logging:** Structured logging using Winston for traceability and debugging.
    *   **Error Handling:** Centralized middleware for consistent error responses.
    *   **Prometheus Metrics:** Exposes its own operational metrics (e.g., request count, response duration) to a Prometheus server.

### 3.3. Database (PostgreSQL)

*   **Technology:** PostgreSQL.
*   **Purpose:** Relational database for persistent storage of all application data.
*   **Key Entities:**
    *   `User`: Stores user credentials and roles.
    *   `Project`: Organizes monitors into logical groups.
    *   `Monitor`: Defines a specific URL/service to be monitored, including configuration (interval, method).
    *   `Metric`: Stores individual performance data points (response time, status, timestamp) for each monitor check.
    *   `Alert`: Stores alert configurations (thresholds, conditions) and their current status.
*   **ORM:** TypeORM is used for interacting with the database, providing a robust and type-safe abstraction layer.

### 3.4. Cache (Redis)

*   **Technology:** Redis.
*   **Purpose:** In-memory data store used for:
    *   **API Response Caching:** Caching responses from read-heavy API endpoints (e.g., fetching a monitor's historical metrics) to reduce database queries and improve API latency.
    *   (Potential future use: Session storage, distributed locks, real-time data streams).

### 3.5. Monitoring Worker (within Backend)

*   **Mechanism:** Implemented as a background job within the Node.js backend using `node-cron`.
*   **Purpose:** Responsible for executing the actual monitoring checks.
*   **Process:**
    1.  Scheduled by `node-cron` to run periodically.
    2.  Fetches active monitors from the database.
    3.  For each monitor, it makes an HTTP request to the target URL.
    4.  Records the response time, HTTP status, and any errors.
    5.  Persists the collected `Metric` data to the PostgreSQL database.
    6.  Evaluates `Alert` conditions based on new metrics and triggers alerts if thresholds are breached.

### 3.6. External Monitored Services

*   These are the web applications, APIs, or URLs that PerformancePulse is configured to monitor. The system makes HTTP requests to these services to gather performance data.

## 4. Observability Stack

### 4.1. Prometheus

*   **Technology:** Prometheus.
*   **Purpose:** Time-series database and monitoring system.
*   **Role:** Scrapes operational metrics exposed by the PerformancePulse Backend API (via `prom-client`) at regular intervals. This allows monitoring the health and performance of the monitoring system itself.

### 4.2. Grafana

*   **Technology:** Grafana.
*   **Purpose:** Data visualization and dashboarding tool.
*   **Role:** Connects to Prometheus as a data source and displays interactive dashboards for visualizing the operational metrics of the PerformancePulse backend. This helps in understanding the performance and resource utilization of PerformancePulse itself.

## 5. Design Principles

*   **Modularity:** Code is organized into distinct modules (services, controllers, repositories, middleware) to promote separation of concerns and maintainability.
*   **Scalability:** Stateless backend services (except for the database and cache), allowing for easy horizontal scaling. Utilizes efficient asynchronous operations.
*   **Security:** JWT-based authentication, role-based authorization, secure password hashing, rate limiting.
*   **Reliability:** Robust error handling, comprehensive testing, and a resilient database.
*   **Observability:** Integrated logging, custom application metrics exposed via Prometheus, and clear dashboards in Grafana.
*   **Maintainability:** Consistent coding standards (ESLint, Prettier), TypeScript for type safety, and thorough documentation.
*   **Performance:** Caching layer, optimized database queries (via TypeORM), efficient background jobs.

## 6. Data Flow Example: Monitoring a URL

1.  A user logs into the **Frontend App**.
2.  The user navigates to a **Project** and creates a new **Monitor** (e.g., `https://example.com`, check every 60 seconds).
3.  The **Frontend App** sends a `POST /api/monitors` request to the **Backend API**.
4.  The **Backend API** validates the request, creates a `Monitor` entity in **PostgreSQL**, and returns a success response.
5.  The **Node-cron Scheduler** in the **Backend API** is periodically triggered.
6.  The **Monitoring Worker** fetches active monitors from **PostgreSQL**.
7.  For each active monitor, the **Monitoring Worker** makes an HTTP request to `https://example.com`.
8.  It measures the **response time** and records the **HTTP status code**.
9.  A new `Metric` entity is created and saved to **PostgreSQL**.
10. The **Monitoring Worker** checks for any **Alerts** associated with this monitor whose conditions are now met (e.g., response time > 500ms). If so, it updates the alert status.
11. The user views the **Monitor Detail** page in the **Frontend App**.
12. The **Frontend App** fetches historical metrics via `GET /api/monitors/:id/metrics` from the **Backend API**.
13. The **Backend API** might serve this data from **Redis Cache** if recently accessed, or query **PostgreSQL** if not.
14. The **Frontend App** displays the metrics using **ApexCharts**.
```