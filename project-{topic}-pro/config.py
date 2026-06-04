```python
import os
from datetime import timedelta

class BaseConfig:
    """Base configuration for the application."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "a-very-secret-key-for-dev")
    DEBUG = False
    TESTING = False

    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/cms_db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False # Set to True to log all SQL statements

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "another-super-secret-jwt-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_SECONDS", 3600))) # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 30))) # 30 days
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_CSRF_CHECK_DEFAULT = False # Set to True for stronger security with cookies

    # Caching Configuration (Redis)
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = os.environ.get("CACHE_REDIS_URL", "redis://localhost:6379/0")
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get("CACHE_DEFAULT_TIMEOUT", 300)) # 5 minutes

    # Rate Limiting Configuration (Redis)
    RATELIMIT_ENABLED = os.environ.get("RATELIMIT_ENABLED", "True").lower() == "true"
    RATELIMIT_STORAGE_URL = os.environ.get("RATELIMIT_STORAGE_URL", "redis://localhost:6379/1")
    RATELIMIT_DEFAULT = os.environ.get("RATELIMIT_DEFAULT_LIMIT", "50 per minute")
    RATELIMIT_HEADERS_ENABLED = True # Show X-RateLimit headers in responses

    # Logging Configuration
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
    LOG_FILE_PATH = os.environ.get("LOG_FILE_PATH", "logs/app.log")

    # API Documentation (OpenAPI/Swagger)
    API_TITLE = "CMS API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/api/docs"
    OPENAPI_SWAGGER_UI_PATH = "/swagger-ui"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"

class DevelopmentConfig(BaseConfig):
    """Development specific configuration."""
    DEBUG = True
    SQLALCHEMY_ECHO = True # Log SQL queries in development
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG")

class TestingConfig(BaseConfig):
    """Testing specific configuration."""
    TESTING = True
    DEBUG = True # Often useful for debugging tests
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost:5432/cms_test_db")
    SQLALCHEMY_ECHO = False
    JWT_SECRET_KEY = "test-secret-jwt" # Use a distinct key for tests
    BCRYPT_LOG_ROUNDS = 4 # Speed up bcrypt for tests
    CACHE_TYPE = "NullCache" # Disable caching during tests
    RATELIMIT_ENABLED = False # Disable rate limiting during tests
    LOG_LEVEL = "WARNING" # Reduce log noise during tests

class ProductionConfig(BaseConfig):
    """Production specific configuration."""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    JWT_CSRF_CHECK_DEFAULT = True # Enable CSRF for production with cookies
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
    # For production, consider using a more robust logging solution
    # and potentially an external secret management service.
    # JWT_COOKIE_SECURE = True # Require HTTPS for JWT cookies
    # JWT_COOKIE_CSRF_PROTECT = True
```