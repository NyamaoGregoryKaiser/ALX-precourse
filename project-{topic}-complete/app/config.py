```python
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-super-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-jwt-secret-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Caching configuration
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'RedisCache')
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300 # 5 minutes

    # Rate Limiting configuration
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/1') # Use a different DB for rate limit

    # Logging configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    SENTRY_DSN = os.environ.get('SENTRY_DSN') # For production error monitoring

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost:5432/task_manager_db')
    FLASK_ENV = 'development'
    LOG_LEVEL = 'DEBUG'

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:' # Use in-memory SQLite for faster tests
    FLASK_ENV = 'testing'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5) # Shorter expiration for tests
    CACHE_TYPE = 'NullCache' # Disable cache for tests
    RATELIMIT_ENABLED = False # Disable rate limit for tests

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL must be set in production environment.")
    FLASK_ENV = 'production'
    # SENTRY_DSN should be set in environment for production
```