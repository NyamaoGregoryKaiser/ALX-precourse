.
├── CMakeLists.txt              # CMake build configuration
├── vcpkg.json                  # vcpkg manifest for C++ dependency management
├── .env.example                # Example environment variables
├── Dockerfile                  # Docker build for the application
├── docker-compose.yml          # Docker Compose for app + DB
├── .github/workflows/          # CI/CD configurations
│   └── ci.yml
├── docs/                       # Project documentation
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
├── database/                   # Database schema, migrations, seed data
│   ├── init.sql
│   ├── seed.sql
│   └── migrations/
│       └── V1__create_initial_tables.sql
├── src/                        # Core application source code
│   ├── main.cpp                # Server entry point
│   ├── common/                 # Common utilities and helpers
│   │   ├── uuid.hpp            # UUID generation
│   │   ├── json_utils.hpp      # JSON serialization/deserialization helpers
│   │   ├── logger.hpp          # spdlog wrapper
│   │   ├── config.hpp          # Environment configuration loader
│   │   └── error.hpp           # Custom error definitions
│   ├── auth/                   # Authentication and Authorization module
│   │   ├── jwt_manager.hpp     # JWT token handling
│   │   ├── auth_service.hpp    # User registration and login business logic
│   │   └── auth_middleware.hpp # JWT verification middleware
│   ├── models/                 # Data structures representing database entities
│   │   ├── user.hpp
│   │   ├── content.hpp
│   │   └── media.hpp
│   ├── database/               # Database interaction layer
│   │   ├── db_connection.hpp   # PostgreSQL connection management
│   │   ├── user_repository.hpp # CRUD operations for User model
│   │   ├── content_repository.hpp # CRUD for Content model
│   │   └── media_repository.hpp# CRUD for Media model
│   ├── services/               # Business logic layer
│   │   ├── content_service.hpp # Content-related business operations
│   │   ├── user_service.hpp    # User-related business operations
│   │   └── media_service.hpp   # Media-related business operations
│   ├── api/                    # API endpoints and server setup
│   │   ├── router.hpp          # Central API router and middleware application
│   │   ├── auth_routes.hpp     # Authentication API endpoints
│   │   ├── user_routes.hpp     # User management API endpoints
│   │   ├── content_routes.hpp  # Content management API endpoints
│   │   ├── media_routes.hpp    # Media upload/management API endpoints
│   │   └── middleware.hpp      # Global middleware (logging, error, rate limiting)
│   ├── cache/                  # Caching layer
│   │   └── lru_cache.hpp       # Generic LRU Cache implementation
│   └── frontend/               # Static files for a minimal web client
│       ├── index.html
│       └── script.js
├── tests/                      # Test suite
│   ├── CMakeLists.txt
│   ├── unit/
│   │   ├── test_uuid.cpp
│   │   ├── test_lru_cache.cpp
│   │   └── test_jwt_manager.cpp
│   ├── integration/
│   │   ├── test_db_connection.cpp
│   │   └── test_user_repository.cpp
│   └── api/
│       └── test_api_content.cpp # Example API test