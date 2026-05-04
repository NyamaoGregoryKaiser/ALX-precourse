```python
# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key_for_dev')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/dpa_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default_jwt_secret_key_for_dev')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_DAYS', 7)) * 24 * 60 * 60 # 7 days
    
    # Redis Cache Configuration
    CACHE_TYPE = 'redis'
    CACHE_REDIS_URL = os.getenv('CACHE_REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300 # 5 minutes

    # Celery Configuration
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')

    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()

    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.getenv('CACHE_REDIS_URL', 'redis://localhost:6379/0') # Use same redis for rate limiting
    RATELIMIT_DEFAULT = os.getenv('RATE_LIMIT_DEFAULT', '200 per day; 50 per hour')
    RATELIMIT_AUTHENTICATION_ENDPOINT = os.getenv('RATE_LIMIT_AUTH', '5 per minute')


class DevelopmentConfig(Config):
    DEBUG = True
    FLASK_ENV = 'development'
    # Override with development-specific settings if any

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv('TEST_DATABASE_URL', 'postgresql://dpa_test_user:dpa_test_password@dpa_db:5432/dpa_test_db')
    CACHE_REDIS_URL = os.getenv('TEST_CACHE_REDIS_URL', 'redis://localhost:6379/3')
    CELERY_BROKER_URL = os.getenv('TEST_CELERY_BROKER_URL', 'redis://localhost:6379/4')
    CELERY_RESULT_BACKEND = os.getenv('TEST_CELERY_RESULT_BACKEND', 'redis://localhost:6379/5')
    RATELIMIT_STORAGE_URL = os.getenv('TEST_CACHE_REDIS_URL', 'redis://localhost:6379/3')
    WTF_CSRF_ENABLED = False # Disable CSRF for easier testing

class ProductionConfig(Config):
    DEBUG = False
    FLASK_ENV = 'production'
    # More restrictive settings for production, e.g., HTTPS only, stricter rate limits, etc.
```