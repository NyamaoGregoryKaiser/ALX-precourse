```markdown
# SQLInsight Pro: Architecture Documentation

This document describes the architecture of the SQLInsight Pro system, focusing on its components, interactions, and design principles.

## 1. System Context

SQLInsight Pro is a web-based platform designed to assist developers and DBAs in optimizing SQL query performance. It acts as a central hub for collecting slow query metrics, performing automated analysis, and providing actionable suggestions.

**External Systems:**
*   **Client Applications:** Any application (e.g., microservices, monoliths, dashboards) that executes SQL queries and can be configured to report slow query logs/data to SQLInsight Pro.
*   **Users/DBAs:** Individuals who interact with the SQLInsight Pro web interface to configure databases, view query analytics, and manage optimization suggestions.

## 2. Container Diagram (C4 Model Level 1)

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_WITH_LEGEND

Container_Boundary(sqlinsight_pro_system, "SQLInsight Pro System") {
    Container(frontend, "Frontend Web Application", "React, TypeScript, Nginx", "Provides the user interface for DBAs and Developers.")
    Container(backend_api, "Backend API", "Node.js, Express, TypeScript, TypeORM", "Exposes RESTful API for frontend and external applications. Handles business logic, query analysis, auth, and data persistence.")
    Container(postgresql_db, "PostgreSQL Database", "PostgreSQL", "Stores application data, slow query logs, analysis results, and user information.")
    Container(redis_cache, "Redis Cache", "Redis", "In-memory data store for caching query results, session management, and potentially token blacklisting.")
}

System_Ext(client_applications, "Client Applications", "Applications that execute SQL queries and report slow ones.")
Person(dba_developer, "DBA/Developer", "Manages database optimization tasks via the web interface.")

Rel(dba_developer, frontend, "Uses")
Rel(frontend, backend_api, "Makes API calls to", "HTTPS")
Rel(client_applications, backend_api, "Reports slow queries to", "HTTP/S")
Rel(backend_api, postgresql_db, "Reads from and writes to", "JDBC/ORM")
Rel(backend_api, redis_cache, "Reads from and writes to", "Redis Client")

@enduml
```

## 3. Component Diagram (C4 Model Level 2 - Backend API)

This focuses on the internal structure of the `Backend API` container.

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

LAYOUT_WITH_LEGEND

Container(backend_api, "Backend API", "Node.js, Express, TypeScript, TypeORM", "Exposes RESTful API for frontend and external applications. Handles business logic, query analysis, auth, and data persistence.") {

    Component(auth_module, "Auth Module", "TypeScript", "Handles user registration, login (JWT), logout, and token validation.")
    Component(user_module, "User Module", "TypeScript", "Manages user accounts (CRUD, roles).")
    Component(db_module, "Database Module", "TypeScript", "Manages registered database instances (CRUD).")
    Component(query_reporting_module, "Query Reporting Module", "TypeScript", "Receives, validates, and stores slow query reports.")
    Component(query_analysis_engine, "Query Analysis Engine", "TypeScript (Rule-based)", "Parses SQL queries, generates simulated EXPLAIN plans, and suggests optimizations.")
    Component(middleware_stack, "Middleware Stack", "TypeScript", "Includes authentication, authorization, error handling, logging, and rate limiting.")
    Component(cache_service, "Cache Service", "TypeScript (Redis Client)", "Provides caching functionalities for improving API response times.")
    Component(logger_service, "Logger Service", "TypeScript (Winston)", "Centralized logging for application events and errors.")
    Component(data_access_layer, "Data Access Layer", "TypeORM, Entities", "Manages interaction with PostgreSQL database using ORM entities.")

    Rel(middleware_stack, auth_module, "Uses for authentication")
    Rel(middleware_stack, user_module, "Uses for authorization (role checks)")
    Rel(middleware_stack, logger_service, "Uses for request logging")

    Rel(auth_module, data_access_layer, "Persists User data via")
    Rel(user_module, data_access_layer, "Manages User data via")
    Rel(db_module, data_access_layer, "Manages Database entities via")
    Rel(query_reporting_module, data_access_layer, "Persists SlowQuery data via")
    Rel(query_reporting_module, query_analysis_engine, "Triggers analysis on new slow queries")
    Rel(query_analysis_engine, data_access_layer, "Persists QueryPlan and QuerySuggestion data via")

    Rel(auth_module, cache_service, "May use for token blacklisting/sessions")
    Rel(backend_api, middleware_stack, "All requests pass through")
    Rel(data_access_layer, postgresql_db, "Interacts with", "SQL")
    Rel(cache_service, redis_cache, "Interacts with", "Redis protocol")
}

System_Ext(postgresql_db, "PostgreSQL Database", "Stores application data.")
System_Ext(redis_cache, "Redis Cache", "In-memory data store.")

@enduml
```

## 4. Business Logic and Data Processing

The core business logic resides primarily within the **Backend API**, specifically in:

*   **Auth Module:**
    *   Hashing passwords (`bcryptjs`).
    *   Generating/Verifying JWTs.
*   **Query Analysis Engine (Algorithm Design & Technical Problem Solving):**
    *   **SQL Parsing & Pattern Matching:** This component (simplified in current implementation) would conceptually parse incoming SQL queries. It uses regular expressions and string matching to identify common anti-patterns like `SELECT *`, `LIKE '%value'`, absence of `WHERE` clauses on large tables, or functions applied to indexed columns.
    *   **Explain Plan Simulation:** For demonstration, it simulates fetching an `EXPLAIN` plan and extracting key metrics (total cost, actual rows). In a production environment, this would involve connecting to the target database (using its `connectionString`), running the `EXPLAIN (ANALYZE, FORMAT JSON)` command (or equivalent for MySQL, SQL Server), and parsing the actual output. This requires robust error handling and potentially different parsers for each database type.
    *   **Suggestion Generation:** Based on identified patterns and (simulated) explain plan characteristics, it generates specific optimization suggestions (e.g., `CREATE INDEX`, query rewrite guidance). This involves rule-based logic to map identified issues to concrete solutions.

**Data Flow for a Slow Query Report:**
1.  A **Client Application** sends a `POST` request to `/api/v1/queries/slow` with the SQL query, execution time, and other metadata.
2.  The **Backend API** receives the request.
3.  **Middleware** validates the request body, logs the incoming request, and applies rate limiting.
4.  The **Query Reporting Module** validates `databaseId` and `reporterId`, then saves the `SlowQuery` entity to **PostgreSQL** via TypeORM.
5.  After saving, the **Query Reporting Module** calls the **Query Analysis Engine**.
6.  The **Query Analysis Engine** performs the following:
    *   **Simulates/Fetches Explain Plan:** Generates a mock `QueryPlan` JSON or attempts to fetch a real one from the target database.
    *   **Analyzes Query Text:** Applies its rule-based logic to the SQL query string.
    *   **Generates Suggestions:** Creates `QuerySuggestion` entities based on the analysis.
    *   Persists the `QueryPlan` and `QuerySuggestion` entities to **PostgreSQL**.
7.  The **Backend API** responds to the client application with the saved `SlowQuery` data.

## 5. Data Model (Entities)

*   `User`: Represents platform users (admin, regular). Authenticated via JWT.
*   `Database`: Represents a database instance being monitored (e.g., `Order_Management_DB`). Stores connection details (conceptually encrypted).
*   `SlowQuery`: Stores details of a reported slow query (the SQL string, execution time, source).
*   `QueryPlan`: Stores the (simulated or real) `EXPLAIN` plan output for a `SlowQuery`.
*   `QuerySuggestion`: Stores optimization suggestions generated by the analysis engine for a `SlowQuery`.

## 6. Design Principles & ALX Focus

*   **Modularity:** The backend is divided into distinct modules (Auth, Users, Databases, Queries) with clear responsibilities, promoting maintainability and scalability.
*   **Separation of Concerns:** Business logic, data access, and presentation layers are distinct.
*   **Layered Architecture:** Backend features service, controller, and data access layers.
*   **Robust Error Handling:** Custom error classes and a global error handling middleware ensure consistent and informative error responses.
*   **Authentication & Authorization:** JWT-based access control with role-based authorization for sensitive operations.
*   **Logging & Monitoring:** Comprehensive logging with Winston helps in debugging and operational insights.
*   **Data Validation:** Yup schemas are used for input validation, ensuring data integrity at API entry points.
*   **Caching:** Redis integration demonstrates a common pattern for performance enhancement.
*   **Technical Problem Solving (Query Analysis):** The `query.analyzer.ts` is the heart of the system's "database optimization" logic. It embodies:
    *   **Algorithm Design:** The rule-based detection of SQL anti-patterns, string parsing, and mapping these to actionable suggestions represent a simplified algorithm for query optimization. A more advanced version would involve AST (Abstract Syntax Tree) parsing and graph traversal algorithms on the query plan.
    *   **Programming Logic:** Implementing the specific checks for `SELECT *`, `LIKE '%prefix'`, `ORDER BY` without `LIMIT`, and joining strategies demonstrates careful programming logic to identify problematic patterns.
    *   **Scalability Consideration:** While the current analysis is synchronous and in-process, a real system would likely offload this to a message queue and a separate worker service for asynchronous, scalable processing, especially when dealing with complex queries or high reporting volumes.
*   **Testability:** Clear separation of logic makes unit and integration testing easier.

## 7. Future Enhancements

*   **Real Explain Plan Integration:** Connect to actual databases to run `EXPLAIN ANALYZE` and parse outputs from PostgreSQL, MySQL, SQL Server, etc.
*   **Advanced SQL Parsing:** Use a dedicated SQL parser library to build an AST for more robust and accurate query analysis.
*   **Machine Learning for Suggestions:** Implement ML models to learn from historical query performance and applied suggestions to provide more intelligent and context-aware recommendations.
*   **Asynchronous Processing:** Use a message queue (RabbitMQ, Kafka) for reporting slow queries to decouple client applications from the analysis engine, making the system more resilient and scalable.
*   **Historical Performance Tracking:** Store execution metrics over time to show trends and regressions.
*   **User Feedback Loop:** Allow users to rate suggestion helpfulness, feeding into the ML model.
*   **Full-Text Search:** For querying historical SQL queries.
*   **Advanced UI/UX:** More interactive visualizations for query plans (e.g., D3.js based tree graphs).
*   **Database Credentials Encryption:** Store `connectionString` encrypted at rest and decrypt on demand.
*   **Multi-Tenancy:** Support multiple organizations/teams with isolated data.

This architecture provides a solid foundation for a comprehensive database optimization system, extensible for future, more sophisticated features.
```

### `API_DOCS.md`