```python
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'my_secret_key_please_change_this_in_production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'super-secret-jwt-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = False
    TESTING = False

    # Caching
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'RedisCache')
    CACHE_REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    CACHE_REDIS_PORT = os.getenv('REDIS_PORT', '6379')
    CACHE_REDIS_DB = os.getenv('REDIS_DB', '0')
    CACHE_REDIS_URL = f"redis://{CACHE_REDIS_HOST}:{CACHE_REDIS_PORT}/{CACHE_REDIS_DB}"
    CACHE_DEFAULT_TIMEOUT = os.getenv('CACHE_DEFAULT_TIMEOUT', 300) # 5 minutes

    # Rate Limiting
    RATELIMIT_STORAGE_URL = f"redis://{CACHE_REDIS_HOST}:{CACHE_REDIS_PORT}/{CACHE_REDIS_DB}"
    RATELIMIT_DEFAULT = os.getenv('RATELIMIT_DEFAULT', "200 per day;50 per hour")

    # Scheduler
    SCHEDULER_API_ENABLED = False # Disable API for APScheduler
    SCHEDULER_EXECUTORS = {
        'default': {'type': 'threadpool', 'max_workers': 20}
    }
    SCHEDULER_JOB_DEFAULTS = {
        'coalesce': True,
        'max_instances': 3
    }

    # Monitoring
    DEFAULT_POLLING_INTERVAL_SECONDS = int(os.getenv('DEFAULT_POLLING_INTERVAL_SECONDS', 60)) # Poll every 60 seconds

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DEV_DATABASE_URL',
        'postgresql://dev_user:dev_password@localhost:5432/performance_monitor_dev'
    )
    # Ensure this matches docker-compose service name if running in Docker
    CACHE_REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
    RATELIMIT_STORAGE_URL = f"redis://{CACHE_REDIS_HOST}:{Config.CACHE_REDIS_PORT}/{Config.CACHE_REDIS_DB}"
    SQLALCHEMY_ECHO = True # Log all SQL queries

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'TEST_DATABASE_URL',
        'postgresql://test_user:test_password@localhost:5433/performance_monitor_test'
    )
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # Shorter expiry for tests
    CACHE_TYPE = 'NullCache' # Disable caching for tests
    SCHEDULER_API_ENABLED = False # Ensure scheduler is off
    SQLALCHEMY_ECHO = False # No SQL logging during tests

class ProductionConfig(Config):
    """Production configuration."""
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://user:password@db:5432/performance_monitor_prod'
    )
    # Ensure this matches docker-compose service name if running in Docker
    CACHE_REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
    RATELIMIT_STORAGE_URL = f"redis://{CACHE_REDIS_HOST}:{Config.CACHE_REDIS_PORT}/{Config.CACHE_REDIS_DB}"
    # Security best practices
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_CSRF_PROTECT = True
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    DEBUG = False # Ensure debug is off in production

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
}

```