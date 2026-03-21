import os
from datetime import timedelta

class Config:
    """Base configuration class."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default_secret_key_for_dev')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default_jwt_secret_key_for_dev')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True to log all SQL queries

    # JWT Configuration
    JWT_TOKEN_LOCATION = ['headers']
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 15)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 30)))
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']

    # Caching Configuration
    CACHE_TYPE = 'redis'
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = int(os.environ.get('CACHE_DEFAULT_TIMEOUT', 300)) # 5 minutes

    # Rate Limiting Configuration
    # Example: "200 per day;50 per hour"
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    RATELIMIT_DEFAULT = os.environ.get('RATE_LIMIT_DEFAULT', '200 per day;50 per hour')

    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FILE_PATH = os.environ.get('LOG_FILE_PATH', 'logs/app.log')
    LOG_MAX_BYTES = 10 * 1024 * 1024 # 10 MB
    LOG_BACKUP_COUNT = 5

    # Flasgger (Swagger UI) Configuration
    SWAGGER = {
        'title': 'Task Management API',
        'uiversion': 3,
        'doc_dir': './app/templates/', # Where index.html for swagger is (optional for custom ui)
        'swagger_ui_bundle_js': 'https://unpkg.com/swagger-ui-dist@3.52.0/swagger-ui-bundle.js',
        'swagger_ui_standalone_preset_js': 'https://unpkg.com/swagger-ui-dist@3.52.0/swagger-ui-standalone-preset.js',
        'swagger_ui_css': 'https://unpkg.com/swagger-ui-dist@3.52.0/swagger-ui.css'
    }

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///app.db')
    SQLALCHEMY_ECHO = True # Log SQL queries in development
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEBUG').upper()

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    # Use PostgreSQL in production
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'postgresql://user:password@db:5432/mydatabase')
    # Ensure a strong, unique secret key is set via environment variables in production
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

    if not Config.SECRET_KEY or not Config.JWT_SECRET_KEY:
        raise ValueError("SECRET_KEY and JWT_SECRET_KEY must be set in environment for production.")
```