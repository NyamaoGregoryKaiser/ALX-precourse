# ML Utilities System (MLU-Sys) - Architecture Documentation

## 1. High-Level Architecture

The ML Utilities System follows a **monorepo structure** (for development convenience) and a **microservice-lite/layered architecture** approach for its core components. It consists of a decoupled frontend and a robust backend API, interacting with a PostgreSQL database and Redis cache.

```mermaid
graph TD
    User -->|Accesses via Browser| Frontend(React App)
    Frontend -->|HTTP/HTTPS API Calls| Nginx(Reverse Proxy/Load Balancer)
    Nginx -->|Routes Requests to| Backend(NestJS API)

    subgraph Backend Services
        Backend -->|Writes/Reads Metadata| PostgreSQL(Database)
        Backend -->|Caches Data / Pub/Sub| Redis(Cache / Message Broker)
        Backend -->|Stores Files| LocalStorage(File System) -->|or Cloud Storage (S3/GCS)|
    end

    Backend --Optional--> ExternalMLService(TensorFlow/PyTorch Serving, FastAPI ML API)
    ExternalMLService --|Makes Predictions| Backend
```

**Key Principles:**

*   **Separation of Concerns**: Frontend and backend are independent. Backend modules are also separated (Auth, Users, Datasets, Models, Predictions).
*   **API-First Design**: All frontend-backend communication happens via a well-defined RESTful API.
*   **Scalability**: Components can be scaled independently (e.g., multiple backend instances).
*   **Security**: Authentication, authorization, input validation, and secure defaults.
*   **Observability**: Centralized logging and error handling.

## 2. Backend Architecture (NestJS)

The backend is built with NestJS, leveraging its modularity, dependency injection, and decorators for a structured and maintainable codebase.

```mermaid
graph TD
    A[Client Request] --> B(Global Middlewares/Guards/Interceptors)
    B --> C{Controller}
    C --> D[DTO Validation]
    D --> E(Service Layer)
    E --> F[Repository/ORM (TypeORM)]
    F --> G(PostgreSQL Database)
    E --> H(FilesService)
    H --> I(Local File Storage)
    E --> J(CacheManager)
    J --> K(Redis Cache)
    E --Optional--> L(External ML Service)
    L --&gt; E
    E --> M(AppLogger)
    M --> N(Winston Logs)
    B --> O{Authentication Guard (JWT)}
    B --> P{Authorization Guard (Roles)}
    B --> Q{Global Exception Filter}
    Q --> M
    C --> R[Swagger/API Docs]

    subgraph NestJS Modules
        subgraph AuthModule
            authC[AuthController] --- authS[AuthService]
            authS --- usersS[UsersService]
            authS --- jwtS[JwtService]
            jwtS --- jwtStrat[JwtStrategy]
        end

        subgraph UsersModule
            usersC[UsersController] --- usersS[UsersService]
            usersS --- usersRepo[UsersRepository]
        end

        subgraph DatasetsModule
            datasetsC[DatasetsController] --- datasetsS[DatasetsService]
            datasetsS --- datasetsRepo[DatasetsRepository]
            datasetsS --- filesS[FilesService]
        end

        subgraph ModelsModule
            modelsC[ModelsController] --- modelsS[ModelsService]
            modelsS --- modelsRepo[ModelsRepository]
            modelsS --- filesS[FilesService]
        end

        subgraph PredictionsModule
            predictionsC[PredictionsController] --- predictionsS[PredictionsService]
            predictionsS --- predictionsRepo[PredictionLogsRepository]
            predictionsS --- modelsS
        end

        subgraph FilesModule
            filesS[FilesService]
        end

        subgraph CommonModule
            guards[RolesGuard]
            filters[AllExceptionsFilter]
            interceptors[HttpCacheInterceptor]
            logger[AppLogger]
        end

        authC --- usersS
        authS --- usersS
        datasetsS --- filesS
        modelsS --- filesS
        predictionsS --- modelsS
    end
```

### 2.1. Key Components

*   **Controllers**: Handle incoming HTTP requests, route them to appropriate services, and return responses. They define API endpoints and integrate with DTOs for input validation.
*   **Services**: Encapsulate the core business logic. They orchestrate data operations, interact with repositories, and perform computations. Designed to be reusable and testable.
*   **Repositories (TypeORM)**: Provide an abstraction layer over the database. They manage entities and perform CRUD operations, query building, and transactional logic.
*   **Entities (TypeORM)**: Define the structure of database tables and their relationships.
*   **DTOs (Data Transfer Objects)**: Define the shape of data exchanged between client and server. Used for request payload validation and response structuring.
*   **Authentication (JWT)**: Users authenticate by sending credentials to `AuthController`. Upon successful login, a JWT token is issued. Subsequent requests include this token in the `Authorization` header. `JwtStrategy` validates the token.
*   **Authorization (RolesGuard)**: Role-based access control using `@Roles()` decorator. The `RolesGuard` checks the user's role from the JWT payload against required roles for a given route.
*   **Global Exception Filter**: Catches all unhandled exceptions across the application and formats them into a consistent JSON error response, providing better client experience and simplifying error logging.
*   **Logging (Winston)**: `AppLogger` service provides structured, context-aware logging to both console and daily rotating files, with different levels (debug, info, warn, error).
*   **Caching (Redis)**: `HttpCacheInterceptor` caches GET requests globally, reducing database load and improving response times for frequently accessed data.
*   **File Storage (`FilesService`)**: Handles uploading, retrieving, and deleting files (datasets, models) from the local filesystem. Designed to be extensible for cloud storage.
*   **Configuration (`ConfigModule`)**: Manages environment variables, allowing seamless switching between development, testing, and production settings.
*   **Database Migrations**: TypeORM migrations are used for versioning the database schema, ensuring smooth updates without data loss.

## 3. Frontend Architecture (React)

The frontend is a Single Page Application (SPA) built with React, styled with Tailwind CSS, and using React Router for navigation.

```mermaid
graph TD
    A[User's Browser] --> B(index.html)
    B --> C(main.tsx - React App Entry)
    C --> D(App.tsx - Main Router)
    D --> E{Routes}
    E --> F[LoginPage]
    E --> G[RegisterPage]
    E --> H[ProtectedRoute]
    H --> I[DashboardPage]
    H --> J[DatasetsPage]
    J --> J1[DatasetDetailPage]
    H --> K[ModelsPage]
    K --> K1[ModelDetailPage]
    H --> L[AdminRoute]
    L --> M[UsersPage]

    F --&gt;|Authenticates| N(AuthContext - login)
    N --> O(API Service - Axios)
    O --> P(Backend API)

    I, J, K, M --&gt;|Fetches Data| O
    N --&gt;|Manages JWT| Cookies

    subgraph Reusable Components
        Q[Navbar]
        R[Forms]
        S[Tables]
        T[Modals]
    end

    D --&gt; Q
    J, K, M --&gt; R, S, T
```

### 3.1. Key Components

*   **`main.tsx`**: Entry point, renders the `App` component within `BrowserRouter` and `AuthProvider`.
*   **`App.tsx`**: Main component defining the application's routes using `react-router-dom`.
*   **`AuthContext` & `useAuth` Hook**: Manages user authentication state (user object, JWT token) globally. Stores the token in browser cookies.
*   **`ProtectedRoute` & `AdminRoute`**: HOCs/components that ensure only authenticated users (or admins) can access specific routes, redirecting otherwise.
*   **API Service (`api/api.ts`)**: An Axios instance configured with the backend API base URL. It includes an interceptor to automatically attach the JWT token to outgoing requests and handle common error responses (e.g., 401 Unauthorized).
*   **Pages (`pages/`)**: Top-level components representing distinct views/pages (e.g., Login, Dashboard, Datasets List, Model Detail).
*   **Components (`components/`)**: Reusable UI elements (e.g., Navbar, forms, tables, buttons).
*   **`utils/types.ts`**: Centralized TypeScript interfaces and enums for data consistency between frontend and backend.

## 4. Data Flow

1.  **User Authentication**:
    *   User submits login/register form on Frontend.
    *   Frontend `API` service sends credentials to Backend `AuthController`.
    *   Backend `AuthService` validates credentials/creates user, interacts with `UsersService` and `UserRepository`.
    *   `AuthService` generates a JWT token using `JwtService` and returns it.
    *   Frontend `AuthContext` stores the token in cookies and user data in state.

2.  **Protected Resource Access**:
    *   User navigates to a protected route (e.g., `/datasets`).
    *   `ProtectedRoute` checks `AuthContext` for `user` and `token`.
    *   Frontend `API` service makes a request, attaching the JWT from cookies via an interceptor.
    *   Backend `AuthGuard` and `RolesGuard` validate the JWT and user's role before controller execution.
    *   Controller calls appropriate Service.
    *   Service interacts with Repository/Database, `FilesService`, or `CacheManager`.
    *   Data is returned through the layers to the Frontend.

3.  **File Uploads (Datasets/Models)**:
    *   User selects a file and provides metadata in the Frontend.
    *   Frontend sends a `multipart/form-data` request to the Backend `DatasetsController` or `ModelsController`.
    *   `FileInterceptor` processes the file.
    *   Controller calls `DatasetsService`/`ModelsService`.
    *   Service uses `FilesService` to save the file to local storage and `Repository` to save metadata to PostgreSQL.

4.  **Predictions**:
    *   User provides input data for a deployed model on the Frontend (simulated).
    *   Frontend sends input data to Backend `PredictionsController`.
    *   `PredictionsService` retrieves model metadata, checks `deployed` status.
    *   `PredictionsService` simulates ML inference (or would call an `ExternalMLService`).
    *   `PredictionsService` logs the input/output to `PredictionLogsRepository`.
    *   Returns simulated prediction to Frontend.

## 5. Deployment Considerations

*   **Environment Variables**: Different `.env` files for `development`, `test`, `production` ensure environment-specific configurations. Docker Compose uses `.env.development` by default.
*   **Containerization**: Docker containers ensure consistent environments from development to production.
*   **Orchestration**: Docker Compose is used for local orchestration. For production, Kubernetes or AWS ECS/Fargate would be used.
*   **Reverse Proxy**: Nginx serves the static frontend assets and acts as a reverse proxy for the backend API, handling SSL termination, load balancing, and static file serving.
*   **Database & Cache**: PostgreSQL and Redis are run as separate services, managed by Docker Compose locally, or by managed cloud services (AWS RDS, ElastiCache) in production.
*   **Scalability**: The stateless nature of the backend (except for file storage, which should be externalized in production) allows for easy horizontal scaling of backend instances.
*   **Security**: Ensure HTTPS is enabled in production (handled by Nginx). Implement stricter CORS policies, regularly update dependencies, and follow security best practices.
```