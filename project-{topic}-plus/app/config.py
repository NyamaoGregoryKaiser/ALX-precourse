```python
import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'my_secret_key_for_dev')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'super-secret-jwt-key-replace-me-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 30)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 7)))
    PROPAGATE_EXCEPTIONS = True # Allows error handlers to catch exceptions

    # Cache Configuration (Flask-Caching)
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'RedisCache') # 'SimpleCache', 'RedisCache'
    CACHE_REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300 # 5 minutes

    # Rate Limiting (Flask-Limiter)
    RATELIMIT_STORAGE_URL = os.getenv('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/1')
    RATELIMIT_DEFAULT = "500 per day;100 per hour" # Default rate limits for all routes
    RATELIMIT_HEADERS_ENABLED = True # Include X-RateLimit-* headers in responses

    # Sentry DSN for error monitoring (optional)
    SENTRY_DSN = os.getenv('SENTRY_DSN')

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/ecommerce_db')
    # Use SQLite for simpler dev if preferred:
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'dev.db')
    JWT_SECRET_KEY = 'dev-jwt-secret' # Override for dev
    CACHE_TYPE = 'SimpleCache' # Simpler cache for dev without Redis setup
    RATELIMIT_STORAGE_URL = None # Disable rate limiting storage for local dev to avoid redis dependency

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv('TEST_DATABASE_URL', 'sqlite:///:memory:') # In-memory SQLite for tests
    JWT_SECRET_KEY = 'test-jwt-secret'
    WTF_CSRF_ENABLED = False # Disable CSRF in tests
    CACHE_TYPE = 'null' # No caching in tests
    RATELIMIT_ENABLED = False # Disable rate limiting in tests

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/ecommerce_db')
    # Ensure all secrets are set via environment variables for production
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    CACHE_REDIS_URL = os.environ.get('REDIS_URL')
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL')

    if not all([Config.SECRET_KEY, Config.JWT_SECRET_KEY, Config.SQLALCHEMY_DATABASE_URI]):
        raise ValueError("Critical environment variables for Production must be set!")

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```