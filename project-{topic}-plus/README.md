ecommerce-cpp/
├── src/
│   ├── main.cpp                 # Main application entry point
│   ├── config/                  # Application configuration
│   │   ├── AppConfig.h
│   │   └── AppConfig.cpp
│   ├── models/                  # Data models (Product, User, Order, CartItem)
│   │   ├── BaseEntity.h         # Base for all models
│   │   ├── User.h
│   │   ├── User.cpp
│   │   ├── Product.h
│   │   ├── Product.cpp
│   │   ├── Order.h
│   │   ├── Order.cpp
│   │   ├── CartItem.h
│   │   └── CartItem.cpp
│   ├── database/                # Database interaction (DAO, DBManager)
│   │   ├── DBManager.h          # Connection pooling, transactions
│   │   ├── DBManager.cpp
│   │   ├── DAO.h                # Generic DAO interface
│   │   ├── UserDAO.h
│   │   ├── UserDAO.cpp
│   │   ├── ProductDAO.h
│   │   ├── ProductDAO.cpp
│   │   ├── OrderDAO.h
│   │   └── OrderDAO.cpp
│   ├── services/                # Business logic
│   │   ├── UserService.h
│   │   ├── UserService.cpp
│   │   ├── ProductService.h
│   │   ├── ProductService.cpp
│   │   ├── OrderService.h
│   │   └── OrderService.cpp
│   ├── controllers/             # API endpoint handlers
│   │   ├── AuthController.h
│   │   ├── AuthController.cpp
│   │   ├── UserController.h
│   │   ├── UserController.cpp
│   │   ├── ProductController.h
│   │   ├── ProductController.cpp
│   │   ├── OrderController.h
│   │   └── OrderController.cpp
│   ├── middleware/              # API middleware (Auth, Logging, Error, Rate Limiting)
│   │   ├── AuthMiddleware.h
│   │   ├── AuthMiddleware.cpp
│   │   ├── ErrorHandlingMiddleware.h
│   │   ├── ErrorHandlingMiddleware.cpp
│   │   ├── LoggingMiddleware.h
│   │   ├── LoggingMiddleware.cpp
│   │   ├── RateLimitingMiddleware.h
│   │   └── RateLimitingMiddleware.cpp
│   ├── utils/                   # Utility functions (JWT, Hashing, JSON helpers)
│   │   ├── JwtUtils.h
│   │   ├── JwtUtils.cpp
│   │   ├── BcryptWrapper.h
│   │   ├── BcryptWrapper.cpp
│   │   ├── JsonUtils.h
│   │   └── JsonUtils.cpp
│   └── logger/                  # Logging wrapper
│       ├── Logger.h
│       └── Logger.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── unit/
│   │   ├── test_User.cpp
│   │   ├── test_UserService.cpp
│   │   └── test_JwtUtils.cpp
│   └── integration/
│       ├── test_UserDAO.cpp
│       └── test_OrderService.cpp
├── docs/
│   ├── README.md                # Comprehensive project setup and overview
│   ├── API.md                   # OpenAPI/Swagger documentation blueprint
│   ├── ARCHITECTURE.md          # System architecture overview
│   └── DEPLOYMENT.md            # Deployment guide
├── database/
│   ├── schema.sql               # Database schema definitions
│   ├── migrations/              # Example migration scripts (e.g., using Flyway/Liquibase conceptually)
│   │   └── V1__initial_schema.sql
│   └── seed.sql                 # Seed data
├── config/
│   └── .env.example             # Environment variables example
├── docker/
│   ├── Dockerfile               # Application Dockerfile
│   └── docker-compose.yml       # Docker Compose setup
├── .github/                     # CI/CD configuration
│   └── workflows/
│       └── build_test_deploy.yml
├── CMakeLists.txt               # Main CMake configuration
└── .gitignore