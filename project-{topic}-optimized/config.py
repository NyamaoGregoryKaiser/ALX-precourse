import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_very_secret_key_that_should_be_changed'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://user:password@localhost:5432/scraper_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = SECRET_KEY # Use the same secret for JWT, or define a separate one
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # 1 hour
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_HOST = os.environ.get('REDIS_HOST') or 'redis'
    CACHE_REDIS_PORT = os.environ.get('REDIS_PORT') or 6379
    CACHE_REDIS_DB = os.environ.get('REDIS_CACHE_DB') or 0
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL') or 'redis://localhost:6379/0'
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND') or 'redis://localhost:6379/1'
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FILE = os.environ.get('LOG_FILE', 'app.log')
    RATE_LIMIT_DEFAULT = "100 per day;50 per hour" # Default rate limit for unauthenticated users
    RATE_LIMIT_AUTHENTICATED = "1000 per day;100 per hour" # Default rate limit for authenticated users


class DevelopmentConfig(Config):
    FLASK_ENV = 'development'
    DEBUG = True
    SQLALCHEMY_ECHO = False # Set to True to see SQL queries in logs


class TestingConfig(Config):
    FLASK_ENV = 'testing'
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'postgresql://user:password@localhost:5432/test_scraper_db'
    CELERY_ALWAYS_EAGER = True # Run celery tasks synchronously for testing
    CELERY_TASK_ALWAYS_EAGER = True # Another way to ensure tasks are eager
    CACHE_TYPE = "SimpleCache" # Use in-memory cache for testing


class ProductionConfig(Config):
    FLASK_ENV = 'production'
    DEBUG = False
    SQLALCHEMY_ECHO = False
    LOG_LEVEL = 'INFO'
```