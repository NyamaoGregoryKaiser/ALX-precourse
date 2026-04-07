.
├── CMakeLists.txt
├── README.md
├── API.md
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── config/
│   └── config.json
├── db/
│   ├── init.sql
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed/
│       └── seed_data.sql
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   ├── index.html
│   └── script.js
├── src/
│   ├── main.cpp
│   ├── app.cpp
│   ├── app.h
│   ├── common/
│   │   ├── config.cpp
│   │   ├── config.h
│   │   ├── logger.cpp
│   │   ├── logger.h
│   │   ├── error_handler.h
│   │   ├── http_status.h
│   │   ├── jwt_manager.cpp
│   │   └── jwt_manager.h
│   ├── middleware/
│   │   ├── auth_middleware.cpp
│   │   ├── auth_middleware.h
│   │   ├── rate_limit_middleware.cpp
│   │   └── rate_limit_middleware.h
│   ├── models/
│   │   ├── user.h
│   │   ├── scraping_job.h
│   │   ├── scraping_target.h
│   │   └── scraped_result.h
│   ├── database/
│   │   ├── db_manager.cpp
│   │   ├── db_manager.h
│   │   ├── base_repository.h
│   │   ├── user_repository.cpp
│   │   ├── user_repository.h
│   │   ├── job_repository.cpp
│   │   └── job_repository.h
│   ├── services/
│   │   ├── user_service.cpp
│   │   ├── user_service.h
│   │   ├── job_service.cpp
│   │   ├── job_service.h
│   │   ├── scraper_service.cpp
│   │   └── scraper_service.h
│   ├── controllers/
│   │   ├── auth_controller.cpp
│   │   ├── auth_controller.h
│   │   ├── jobs_controller.cpp
│   │   └── jobs_controller.h
│   ├── scraper/
│   │   ├── scraper_core.cpp
│   │   ├── scraper_core.h
│   │   ├── html_parser.cpp
│   │   └── html_parser.h
│   ├── cache/
│   │   ├── lru_cache.h
│   │   └── cache_manager.h
├── tests/
│   ├── CMakeLists.txt
│   ├── unit/
│   │   ├── test_config.cpp
│   │   ├── test_jwt_manager.cpp
│   │   ├── test_user_repository.cpp
│   │   ├── test_job_repository.cpp
│   │   └── test_lru_cache.cpp
│   ├── integration/
│   │   └── test_db_manager.cpp
│   └── api/
│       └── api_test_script.sh
└── .github/
    └── workflows/
        └── ci_cd.yml