import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret_key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False # Set to True to log all SQL statements for debugging

    # Database configuration for DBOptiFlow's own system database
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/dboptiflow')
    SQLALCHEMY_DATABASE_URI = DATABASE_URL

    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_SECONDS', 3600))) # 1 hour

    # Caching Configuration
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'SimpleCache') # Options: RedisCache, SimpleCache
    CACHE_DEFAULT_TIMEOUT = int(os.getenv('CACHE_DEFAULT_TIMEOUT', 300)) # 5 minutes
    if CACHE_TYPE == 'RedisCache':
        CACHE_REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # Celery Configuration
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    CELERY_TASK_TRACK_STARTED = True
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_TIMEZONE = 'UTC' # Or your desired timezone

    # Rate Limiting Configuration
    RATELIMIT_STORAGE_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RATELIMIT_DEFAULT = "100 per hour" # Default rate limit for all routes
    RATELIMIT_HEADERS_ENABLED = True # Include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers

class DevelopmentConfig(Config):
    """Development configuration."""
    FLASK_ENV = 'development'
    DEBUG = True
    SQLALCHEMY_ECHO = False # Enable to see SQL queries in logs
    # Override with development-specific settings if needed

class TestingConfig(Config):
    """Testing configuration."""
    FLASK_ENV = 'testing'
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://testuser:testpassword@localhost:5432/testdb')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5) # Shorter expiration for tests
    CELERY_ALWAYS_EAGER = True # Run Celery tasks synchronously in tests
    CELERY_BROKER_URL = 'memory://' # Use in-memory broker for tests
    CELERY_RESULT_BACKEND = 'memory://' # Use in-memory backend for tests
    CACHE_TYPE = 'SimpleCache' # Use simple in-memory cache for tests
    # Ensure a dedicated test database is used to avoid data corruption
    # EXTERNAL_TEST_DB_CONFIG = {
    #     'db_type': os.getenv('EXTERNAL_DB_TYPE', 'postgresql'),
    #     'host': os.getenv('EXTERNAL_DB_HOST', 'localhost'),
    #     'port': int(os.getenv('EXTERNAL_DB_PORT', 5432)),
    #     'username': os.getenv('EXTERNAL_DB_USER', 'testuser'),
    #     'password': os.getenv('EXTERNAL_DB_PASS', 'testpass'),
    #     'database': os.getenv('EXTERNAL_DB_NAME', 'testdb')
    # }


class ProductionConfig(Config):
    """Production configuration."""
    FLASK_ENV = 'production'
    DEBUG = False
    SQLALCHEMY_ECHO = False
    # For production, ensure `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`
    # are set via environment variables and are highly secure.
    # Consider using a more robust logging solution like Sentry or ELK stack.

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}
```