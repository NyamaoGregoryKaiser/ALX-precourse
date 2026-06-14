aurora-metrics/
├── src/
│   ├── main.cpp
│   ├── config/
│   │   └── AppConfig.h
│   │   └── AppConfig.cpp
│   ├── controllers/
│   │   └── AuthController.h
│   │   └── AuthController.cpp
│   │   └── MetricsController.h
│   │   └── MetricsController.cpp
│   │   └── UsersController.h
│   │   └── UsersController.cpp
│   ├── services/
│   │   └── AuthService.h
│   │   └── AuthService.cpp
│   │   └── MetricService.h
│   │   └── MetricService.cpp
│   │   └── UserService.h
│   │   └── UserService.cpp
│   ├── repositories/
│   │   └── UserRepository.h
│   │   └── UserRepository.cpp
│   │   └── MetricRepository.h
│   │   └── MetricRepository.cpp
│   │   └── DatabaseManager.h
│   │   └── DatabaseManager.cpp
│   ├── models/
│   │   └── User.h
│   │   └── Metric.h
│   │   └── MetricData.h
│   │   └── JWTClaims.h
│   ├── middleware/
│   │   └── AuthMiddleware.h
│   │   └── ErrorMiddleware.h
│   │   └── RateLimitMiddleware.h
│   ├── utils/
│   │   └── Logger.h
│   │   └── JWTManager.h
│   │   └── Cache.h
│   │   └── StringUtil.h
│   │   └── TimeUtil.h
│   ├── agents/
│   │   └── SystemMonitorAgent.h   // Simulate metric collection
│   │   └── SystemMonitorAgent.cpp
│   └── web/
│       └── public/
│           ├── index.html
│           ├── style.css
│           └── app.js
│
├── tests/
│   ├── unit/
│   │   └── TestAppConfig.cpp
│   │   └── TestUserService.cpp
│   │   └── TestMetricService.cpp
│   │   └── TestJWTManager.cpp
│   ├── integration/
│   │   └── TestDatabaseIntegration.cpp
│   │   └── TestAPIIntegration.cpp
│   └── performance/
│       └── api_load_test.sh     // using wrk or similar
│
├── db/
│   ├── migrations/
│   │   └── V1__create_initial_schema.sql
│   │   └── V2__add_metric_indexes.sql
│   ├── seed/
│   │   └── seed.sql
│   └── Dockerfile_db             // Custom Dockerfile for DB init
│
├── docs/
│   ├── README.md
│   ├── API.md                    // OpenAPI/Swagger spec
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
├── config/
│   └── .env.example
│   └── CppProperties.json        // For VS Code users
│
├── CMakeLists.txt
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci-cd.yml
└── scripts/
    └── run_migrations.sh
    └── run_tests.sh
    └── generate_jwt_secret.sh