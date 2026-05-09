visuflow/
├── CMakeLists.txt
├── .clang-format
├── .gitignore
├── README.md
├── docker-compose.yml
├── Dockerfile
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_DOCS.md
│   └── DEPLOYMENT.md
├── scripts/
│   ├── ci/
│   │   └── build_and_test.sh
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   └── 002_add_dashboards_table.sql
│   │   └── seed.sql
│   └── performance_test.py
├── src/
│   ├── main.cpp
│   ├── api/
│   │   ├── ApiServer.h
│   │   ├── ApiServer.cpp
│   │   ├── handlers/
│   │   │   ├── AuthHandler.h
│   │   │   ├── AuthHandler.cpp
│   │   │   ├── DataHandler.h
│   │   │   ├── DataHandler.cpp
│   │   │   ├── DashboardHandler.h
│   │   │   └── DashboardHandler.cpp
│   │   ├── middleware/
│   │   │   ├── AuthMiddleware.h
│   │   │   ├── AuthMiddleware.cpp
│   │   │   ├── RateLimitMiddleware.h
│   │   │   └── RateLimitMiddleware.cpp
│   │   └── dto/
│   │       ├── DataTransferObjects.h
│   │       └── DataTransferObjects.cpp
│   ├── core/
│   │   ├── security/
│   │   │   ├── JWTManager.h
│   │   │   └── JWTManager.cpp
│   │   ├── cache/
│   │   │   ├── CacheManager.h
│   │   │   └── CacheManager.cpp
│   │   ├── common/
│   │   │   ├── Constants.h
│   │   │   ├── Utils.h
│   │   │   └── Utils.cpp
│   │   └── config/
│   │       ├── ConfigManager.h
│   │       └── ConfigManager.cpp
│   ├── data/
│   │   ├── datasource/
│   │   │   ├── DataSourceManager.h
│   │   │   ├── DataSourceManager.cpp
│   │   │   ├── connectors/
│   │   │   │   ├── SQLConnector.h
│   │   │   │   └── SQLConnector.cpp
│   │   │   │   └── CSVConnector.h  (conceptual)
│   │   │   │   └── APIConnector.h  (conceptual)
│   │   ├── processor/
│   │   │   ├── DataProcessor.h
│   │   │   └── DataProcessor.cpp
│   │   ├── model/
│   │   │   ├── DataModels.h
│   │   │   └── DataModels.cpp
│   │   └── db/
│   │       ├── Database.h
│   │       ├── Database.cpp
│   │       ├── migrations/
│   │       │   ├── MigrationManager.h
│   │       │   └── MigrationManager.cpp
│   │       └── repositories/
│   │           ├── UserRepository.h
│   │           ├── UserRepository.cpp
│   │           ├── DashboardRepository.h
│   │           └── DashboardRepository.cpp
│   ├── gui/ (Conceptual C++ Frontend components for Desktop Application)
│   │   ├── MainWindow.h
│   │   ├── MainWindow.cpp
│   │   ├── widgets/
│   │   │   ├── ChartWidget.h
│   │   │   └── ChartWidget.cpp
│   │   └── controllers/
│   │       ├── DashboardController.h
│   │       └── DashboardController.cpp
│   └── util/
│       ├── Logger.h
│       ├── Logger.cpp
│       ├── ErrorHandler.h
│       └── ErrorHandler.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── unit/
│   │   ├── TestDataProcessor.cpp
│   │   ├── TestJWTManager.cpp
│   │   └── TestCacheManager.cpp
│   ├── integration/
│   │   ├── TestDatabase.cpp
│   │   └── TestApiServer.cpp
│   └── api/
│       └── test_api.py