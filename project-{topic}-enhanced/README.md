.
├── src/
│   ├── main.cpp
│   ├── config/
│   │   └── AppConfig.h
│   ├── database/
│   │   ├── DbConnection.h
│   │   ├── DbConnection.cpp
│   │   ├── migrations/
│   │   │   └── V1_create_initial_schema.sql
│   │   │   └── V2_add_alert_tables.sql
│   │   └── seed/
│   │       └── seed_data.sql
│   ├── models/
│   │   ├── User.h
│   │   ├── System.h
│   │   ├── Metric.h
│   │   ├── Alert.h
│   ├── services/
│   │   ├── AuthService.h
│   │   ├── UserService.h
│   │   ├── SystemService.h
│   │   ├── MetricService.h
│   │   ├── AlertService.h
│   │   ├── CacheService.h
│   │   ├── RateLimiter.h
│   ├── middleware/
│   │   ├── AuthMiddleware.h
│   │   ├── ErrorMiddleware.h
│   ├── controllers/
│   │   ├── AuthController.h
│   │   ├── UserController.h
│   │   ├── SystemController.h
│   │   ├── MetricController.h
│   │   ├── AlertController.h
│   ├── utils/
│   │   ├── Logger.h
│   │   ├── Crypto.h
│   │   ├── JsonUtils.h
│   │   └── StringConverter.h
│   └── exceptions/
│       └── ApiException.h
├── tests/
│   ├── unit/
│   │   ├── test_models.cpp
│   │   ├── test_services.cpp
│   │   └── test_utils.cpp
│   ├── integration/
│   │   ├── test_database.cpp
│   │   └── test_api.cpp
│   └── CMakeLists.txt
├── web/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── CMakeLists.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── README.md
├── ARCHITECTURE.md
├── API_DOCS.md
├── DEPLOYMENT.md
├── .github/
│   └── workflows/
│       └── ci-cd.yml