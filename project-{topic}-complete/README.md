db_optimizer/
├── CMakeLists.txt
├── app/
│   ├── main.cpp
│   ├── config/
│   │   ├── ConfigManager.hpp
│   │   └── ConfigManager.cpp
│   ├── core/
│   │   ├── Application.hpp
│   │   └── Application.cpp
│   ├── db/
│   │   ├── DBConnectionPool.hpp
│   │   ├── DBConnectionPool.cpp
│   │   ├── PostgreSQLAdapter.hpp
│   │   ├── PostgreSQLAdapter.cpp
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   ├── http/
│   │   ├── HTTPServer.hpp
│   │   ├── HTTPServer.cpp
│   │   ├── Router.hpp
│   │   ├── Router.cpp
│   │   ├── RequestHandler.hpp
│   │   ├── RequestHandler.cpp
│   │   ├── middleware/
│   │   │   ├── AuthMiddleware.hpp
│   │   │   ├── AuthMiddleware.cpp
│   │   │   ├── ErrorMiddleware.hpp
│   │   │   └── ErrorMiddleware.cpp
│   │   └── responses/
│   │       └── APIResponses.hpp
│   ├── models/
│   │   ├── User.hpp
│   │   ├── MonitoredDB.hpp
│   │   ├── QueryLog.hpp
│   │   └── OptimizationReport.hpp
│   ├── services/
│   │   ├── AuthService.hpp
│   │   ├── AuthService.cpp
│   │   ├── DBMonitorService.hpp
│   │   ├── DBMonitorService.cpp
│   │   ├── QueryAnalyzer.hpp
│   │   ├── QueryAnalyzer.cpp
│   │   ├── IndexRecommender.hpp
│   │   └── IndexRecommender.cpp
│   ├── utils/
│   │   ├── Logger.hpp
│   │   ├── Logger.cpp
│   │   ├── JSONUtils.hpp
│   │   ├── JWTUtils.hpp
│   │   ├── JWTUtils.cpp
│   │   ├── Cache.hpp
│   │   └── RateLimiter.hpp
│   └── controllers/
│       ├── AuthController.hpp
│       ├── AuthController.cpp
│       ├── UserController.hpp
│       ├── UserController.cpp
│       ├── MonitoredDBController.hpp
│       ├── MonitoredDBController.cpp
│       ├── OptimizationController.hpp
│       └── OptimizationController.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── unit/
│   │   ├── TestConfigManager.cpp
│   │   ├── TestQueryAnalyzer.cpp
│   │   ├── TestIndexRecommender.cpp
│   │   ├── TestAuthService.cpp
│   ├── integration/
│   │   ├── TestDBMonitorService.cpp
│   │   └── TestAPI.cpp
│   ├── api/
│   │   └── api_tests.sh
├── scripts/
│   ├── migrate.sh
│   ├── seed.sh
│   └── run_performance_test.sh
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── pg_init.sql
├── .env.example
├── .gitignore
├── config.json.example
└── .github/
    └── workflows/
        └── ci-cd.yml