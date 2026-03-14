```markdown
# Task Management System Architecture

This document provides a high-level overview of the architecture for the Task Management System.

## 1. Overview

The Task Management System is designed as a **monolith (Flask backend)** with a **minimal HTML/JavaScript frontend** for demonstration purposes. It follows a layered architectural pattern to promote separation of concerns, maintainability, and scalability.

**Key Technologies:**
*   **Backend**: Python (Flask)
*   **Database**: PostgreSQL
*   **ORM**: SQLAlchemy
*   **Caching/Rate Limiting**: Redis
*   **Authentication**: JWT (JSON Web Tokens)
*   **Deployment**: Docker, Docker Compose, Gunicorn (production web server)
*   **CI/CD**: GitHub Actions
*   **Testing**: Pytest

## 2. System Diagram

```mermaid
graph TD
    User[Web Browser (HTML/JS)] --> |HTTP/HTTPS| Frontend[Nginx/Load Balancer]
    Frontend --> |Reverse Proxy| FlaskApp[Flask Backend (Python/Gunicorn)]
    
    FlaskApp --> |SQLAlchemy (ORM)| PostgreSQL[Database (PostgreSQL)]
    FlaskApp --> |Redis Client| Redis[Cache/Rate Limiter (Redis)]
    
    subgraph Backend Services
        FlaskApp --- A[Routes (API Endpoints)]
        FlaskApp --- B[Services (Business Logic)]
        FlaskApp --- C[Models (Data Access / ORM)]
        FlaskApp --- D[Extensions (DB, JWT, Cache, Limiter)]
        FlaskApp --- E[Utils (Auth, Error Handling, Decorators)]
        A --> B
        B --> C
        C --> D
        A --> E
        B --> E
    end

    User --> |Browser to Flask Directly (Dev)| FlaskApp

    CI_CD[CI/CD (GitHub Actions)] --> |Tests| FlaskApp
    CI_CD --> |Build/Push Image| DockerRegistry[Docker Registry (e.g., Docker Hub)]
    DockerRegistry --> |Pull Image| DeploymentEnv[Production Environment (e.g., Kubernetes, ECS)]
```

## 3. Component Breakdown

### 3.1. Frontend (Demonstration)

*   **Technology**: Pure HTML, CSS, and JavaScript.
*   **Purpose**: Provides a simple user interface to interact with the backend API, demonstrating authentication flows and CRUD operations.
*   **Location**: `app/templates/index.html`, `app/static/style.css`, `app/static/script.js`.
*   **Note**: A production-grade frontend would typically be a separate Single Page Application (SPA) built with frameworks like React, Vue, or Angular, communicating with the API.

### 3.2. Flask Backend (Core Application)

The Flask application is the heart of the system, responsible for handling API requests, executing business logic, and interacting with the database and other services.

#### 3.2.1. `app/__init__.py`
*   Initializes the Flask application.
*   Configures logging (file and console handlers).
*   Initializes Flask extensions (SQLAlchemy, JWT, Bcrypt, Cache, Limiter).
*   Registers blueprints for different API modules (`auth`, `users`, `projects`, `tasks`).
*   Sets up global error handlers.
*   Integrates with Sentry for error monitoring (optional, via DSN).

#### 3.2.2. `app/config.py`
*   Manages application settings for different environments (Development, Testing, Production).
*   Loads sensitive configuration from environment variables (using `python-dotenv`).

#### 3.2.3. `app/extensions.py`
*   Centralizes the initialization and instantiation of Flask extensions like `db` (SQLAlchemy), `migrate` (Alembic), `jwt` (Flask-JWT-Extended), `bcrypt` (Flask-Bcrypt), `cache` (Flask-Caching), and `limiter` (Flask-Limiter).

#### 3.2.4. `app/models/`
*   **Purpose**: Defines the database schema using SQLAlchemy ORM. Each file represents a database table.
*   **Components**:
    *   `user.py`: `User` model for authentication and authorization.
    *   `project.py`: `Project` model for grouping tasks.
    *   `task.py`: `Task` model with details like title, description, status, priority, assignments.
    *   `comment.py`: `Comment` model for adding notes to tasks or projects.
*   **Relationships**: Models define relationships between entities (e.g., a Project has many Tasks, a Task is assigned to a User).

#### 3.2.5. `app/services/`
*   **Purpose**: Encapsulates business logic and orchestrates interactions between models. This layer is responsible for data validation, complex operations, and ensuring data integrity.
*   **Components**:
    *   `user_service.py`: Logic for user creation, retrieval, update, and deletion.
    *   `project_service.py`: Logic for project management.
    *   `task_service.py`: Logic for task and comment management.
*   **Key Principle**: Services should be reusable and independent of the API layer, making the core logic testable and portable.

#### 3.2.6. `app/routes/`
*   **Purpose**: Defines API endpoints using Flask Blueprints. These routes receive HTTP requests, parse input, call the appropriate service methods, and return JSON responses.
*   **Components**:
    *   `auth.py`: User registration, login, logout, token refresh, profile.
    *   `users.py`: CRUD operations for users (admin-only).
    *   `projects.py`: CRUD operations for projects.
    *   `tasks.py`: CRUD operations for tasks and comments.
*   **Authorization**: Decorators (`@jwt_required`, `@admin_required`, `@manager_required_for_project_action`, etc.) are applied to routes for access control.
*   **Error Handling**: Catches exceptions raised by the service layer and converts them into appropriate HTTP error responses.

#### 3.2.7. `app/utils/`
*   **Purpose**: Provides utility functions, decorators, and custom exceptions used across the application.
*   **Components**:
    *   `auth_utils.py`: Helper functions for JWT claims and role checks.
    *   `decorators.py`: Custom decorators for logging, and fine-grained authorization checks.
    *   `error_handlers.py`: Centralized handlers for custom and generic exceptions, ensuring consistent API error responses.
    *   `exceptions.py`: Custom exception classes (e.g., `ResourceNotFound`, `InvalidInput`).

#### 3.2.8. `manage.py`
*   Entry point for Flask CLI commands (e.g., `flask run`, `flask db_commands migrate`, `flask seed`, `flask run-tests`).
*   Initializes the Flask app context for CLI operations.

### 3.3. Database (PostgreSQL)

*   **Persistence Layer**: Stores all application data (users, projects, tasks, comments).
*   **Docker Integration**: Run as a Docker container, making setup consistent across environments.
*   **Alembic**: Used for database migrations to manage schema evolution. Scripts are in the `migrations/` directory.

### 3.4. Cache & Rate Limiter (Redis)

*   **Purpose**:
    *   **Caching**: Stores frequently accessed data (e.g., user profiles) in memory to reduce database load and improve response times.
    *   **Rate Limiting**: Tracks and limits the number of requests a client can make to prevent abuse.
*   **Docker Integration**: Run as a Docker container.

### 3.5. Testing Frameworks

*   **Pytest**: Primary testing framework for unit and integration tests.
*   **Coverage.py**: Measures test coverage to ensure a high percentage of code is tested.
*   **Locust**: Performance testing tool to simulate user load and identify bottlenecks.
*   **Structure**: Tests are organized in `tests/unit`, `tests/integration`, and `tests/performance`.

### 3.6. DevOps & Monitoring

*   **Docker**: Containerization ensures consistent environments from development to production.
*   **Docker Compose**: Orchestrates multi-container applications for local development and testing.
*   **GitHub Actions**: Automates the CI/CD pipeline:
    *   Runs tests on every push/pull request.
    *   Builds Docker images.
    *   (Conceptual) Deploys to a production environment (e.g., AWS ECS, Kubernetes).
*   **Logging**: Python's `logging` module captures application events, errors, and access logs.
*   **Sentry (Conceptual)**: For real-time error tracking and performance monitoring in production.

## 4. Data Flow Example: Creating a Task

1.  **Client Request**: User sends a `POST` request to `/api/tasks/` with task details (JSON body) and a JWT in the Authorization header.
2.  **Flask Route (`app/routes/tasks.py`)**:
    *   The `create_task` function receives the request.
    *   `@jwt_required()` decorator verifies the JWT and extracts the user identity.
    *   Request JSON data is parsed.
    *   `TaskService.create_task()` is called with the task data.
3.  **Task Service (`app/services/task_service.py`)**:
    *   Validates input data (e.g., `title`, `project_id`, `creator_id` are present).
    *   Checks if `project_id`, `creator_id`, `assigned_to_id` correspond to existing resources using `Project.query.get()` and `User.query.get()`.
    *   If validation passes, a new `Task` object is instantiated (`app/models/task.py`).
    *   `db.session.add(task)` stages the new task for persistence.
    *   `db.session.commit()` persists the task to the PostgreSQL database.
    *   Returns the created `Task` object.
4.  **Flask Route (Response)**:
    *   The `Task` object is converted to a dictionary using `task.to_dict()`.
    *   A JSON response with a `201 Created` status code is returned to the client.
5.  **Logging**: Relevant actions are logged at different layers (route access, service operation, model creation) via decorators (`@log_route_access`, `@log_service_operation`, `@log_model_operation`).

## 5. Scalability Considerations

*   **Stateless API**: JWT authentication keeps the API stateless, enabling easy scaling of backend instances.
*   **Database**: PostgreSQL can be scaled vertically or horizontally (e.g., read replicas).
*   **Redis**: Provides offloading for database by caching data and handling rate limiting, reducing direct database hits.
*   **Containerization**: Docker allows for easy deployment and scaling of services on container orchestration platforms (Kubernetes, AWS ECS, etc.).
*   **Asynchronous Tasks**: For long-running operations (e.g., sending notifications, complex reports), integrating a message queue (e.g., Celery with Redis/RabbitMQ) would be beneficial, though not explicitly implemented in this basic version.
```