database-performance-analyzer/
├── .github/
│   └── workflows/
│       └── main.yml
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
├── API_DOCS.md
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth_api.py
│   │   ├── user_api.py
│   │   ├── target_db_api.py
│   │   ├── metric_api.py
│   │   └── suggestion_api.py
│   ├── config.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── db.py
│   │   ├── redis_cache.py
│   │   ├── celery_app.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── error_handlers.py
│   │   └── rate_limiter.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user_model.py
│   │   ├── target_db_model.py
│   │   ├── performance_metric_model.py
│   │   ├── optimization_suggestion_model.py
│   │   └── base_model.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── target_db_service.py
│   │   ├── metric_service.py
│   │   └── suggestion_service.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   └── metric_collection_tasks.py
│   ├── templates/
│   │   ├── index.html
│   │   └── login.html
│   └── utils/
│       ├── __init__.py
│       ├── decorators.py
│       ├── logger.py
│       └── errors.py
├── alembic.ini
├── manage.py
├── seed.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── unit/
    │   ├── test_user_service.py
    │   └── test_auth_service.py
    ├── integration/
    │   ├── test_auth_api.py
    │   └── test_user_api.py
    └── performance/
        └── test_performance.py