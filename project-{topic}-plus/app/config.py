```python
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default_secret_key_for_dev')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@localhost:5432/cms_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default_jwt_secret_key_for_dev')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_SECONDS', 3600)) # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 30)) * 24 * 3600 # 30 days

    # Caching Configuration (Flask-Caching)
    CACHE_TYPE = 'RedisCache'
    CACHE_REDIS_HOST = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_REDIS_PORT = 6379
    CACHE_REDIS_DB = 0
    CACHE_KEY_PREFIX = 'cms_cache_'
    CACHE_DEFAULT_TIMEOUT = 300 # 5 minutes

    # Rate Limiting Configuration (Flask-Limiter)
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    RATELIMIT_STRATEGY = 'moving-window' # or 'fixed-window'
    RATELIMIT_DEFAULT = '200 per day;50 per hour' # Default for all routes

    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()

class DevelopmentConfig(Config):
    """Development configuration."""
    FLASK_ENV = 'development'
    DEBUG = True
    SQLALCHEMY_ECHO = True # Log SQL queries

class ProductionConfig(Config):
    """Production configuration."""
    FLASK_ENV = 'production'
    DEBUG = False
    SQLALCHEMY_ECHO = False
    # Ensure strong, unique secrets for production
    SECRET_KEY = os.environ['SECRET_KEY']
    JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
    # Other production specific settings like error reporting, monitoring tools, etc.

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:') # Use in-memory SQLite for tests
    SQLALCHEMY_ECHO = False
    CACHE_TYPE = 'NullCache' # Disable caching during tests
    RATELIMIT_ENABLED = False # Disable rate limiting during tests
    JWT_ACCESS_TOKEN_EXPIRES = 1 # Short expiry for testing
    JWT_REFRESH_TOKEN_EXPIRES = 1 # Short expiry for testing

def get_config_class():
    """Returns the appropriate configuration class based on FLASK_ENV."""
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig
    elif env == 'testing':
        return TestingConfig
    return DevelopmentConfig

```