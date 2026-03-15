import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default_secret_key_please_change')
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///site.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Caching
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'RedisCache') # 'SimpleCache' for development without Redis
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300 # 5 minutes

    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/1') # Use a different Redis DB for rate limiting
    RATELIMIT_DEFAULT = "2000 per day;500 per hour;50 per minute" # Global default
    RATELIMIT_AUTHENTICATED_DEFAULT = "5000 per day;1000 per hour;100 per minute" # Higher for authenticated users

    # Admin User Defaults for Seeding
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin_password')

    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FILE = os.environ.get('LOG_FILE', 'app.log')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

class DevelopmentConfig(Config):
    FLASK_ENV = 'development'
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///dev.db')
    CACHE_TYPE = 'SimpleCache' # Use simple cache for dev without explicit Redis setup
    RATELIMIT_STORAGE_URL = 'memory://' # Use in-memory for dev

class TestingConfig(Config):
    FLASK_ENV = 'testing'
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:') # Use in-memory SQLite for tests
    CACHE_TYPE = 'SimpleCache'
    RATELIMIT_STORAGE_URL = 'memory://'
    # Disable JWT token expiry during tests for easier testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=10) # Still set, but longer
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(minutes=20)


class ProductionConfig(Config):
    FLASK_ENV = 'production'
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'postgresql://user:password@db:5432/ecommerce_db')
    CACHE_TYPE = 'RedisCache'
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/1')

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}