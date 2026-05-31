import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv() # Load environment variables from .env file

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-super-secret-key-replace-me-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@db:5432/dataviz_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 30)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 7)))

    # Caching configuration (Flask-Caching with Redis)
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'RedisCache')
    CACHE_REDIS_HOST = os.environ.get('REDIS_HOST', 'redis')
    CACHE_REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
    CACHE_REDIS_DB = int(os.environ.get('REDIS_DB', 0))
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get('CACHE_DEFAULT_TIMEOUT', 300)) # 5 minutes

    # Rate Limiting configuration
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'redis://redis:6379/1') # Use a different DB for rate limiting

    # Logging configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FILE = os.environ.get('LOG_FILE', 'app.log') # Path to log file
    LOG_MAX_BYTES = int(os.environ.get('LOG_MAX_BYTES', 10485760)) # 10 MB
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', 5))

    # Data Source Upload/Processing limits
    MAX_UPLOAD_SIZE_MB = int(os.environ.get('MAX_UPLOAD_SIZE_MB', 50))
    MAX_FILE_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024 # In bytes

class DevelopmentConfig(Config):
    DEBUG = True
    # SQLALCHEMY_ECHO = True # Uncomment to log all SQL queries
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL', 'postgresql://user:password@localhost:5432/dataviz_dev')

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'postgresql://user:password@localhost:5432/dataviz_test')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=1) # Shorter expiration for tests
    CACHE_TYPE = 'NullCache' # Disable caching for tests
    RATELIMIT_ENABLED = False # Disable rate limiting for tests

class ProductionConfig(Config):
    DEBUG = False
    # Ensure production uses strong, externally managed secrets
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@db:5432/dataviz_prod')
    LOG_FILE = '/var/log/dataviz_app/app.log' # Production log location

def get_config_class(env_name=None):
    if env_name is None:
        env_name = os.environ.get('FLASK_ENV', 'development')

    if env_name == 'production':
        return ProductionConfig
    elif env_name == 'testing':
        return TestingConfig
    else: # Default to development
        return DevelopmentConfig

# Set default configuration directly if imported without specific environment
app_config = get_config_class()