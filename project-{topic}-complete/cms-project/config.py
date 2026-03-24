import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key-please-change')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-jwt-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'app.db'))
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=60)

    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Caching
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'simple') # 'simple' (in-memory), 'redis', 'memcached'
    CACHE_DEFAULT_TIMEOUT = 300 # 5 minutes

    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'memory://')
    RATELIMIT_DEFAULT = "200 per day;50 per hour"

    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()

    # Flasgger (Swagger UI)
    SWAGGER = {
        'title': 'CMS API',
        'uiversion': 3,
        'headers': [
            ('Access-Control-Allow-Origin', '*'),
            ('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type, Authorization'),
        ],
        'specs': [
            {
                'endpoint': 'apispec_v1',
                'route': '/apidocs/v1.json',
                'rule_filter': lambda rule: rule.endpoint.startswith('api_v1.'),
                'model_filter': lambda tag: True,
            }
        ]
    }


class DevelopmentConfig(Config):
    """Development configuration."""
    FLASK_ENV = 'development'
    DEBUG = True
    SQLALCHEMY_ECHO = True # Log SQL queries
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEBUG').upper()
    CACHE_TYPE = 'simple' # Always use simple cache in dev by default

class TestingConfig(Config):
    """Testing configuration."""
    FLASK_ENV = 'testing'
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///:memory:') # In-memory SQLite for tests
    JWT_SECRET_KEY = 'test_jwt_secret'
    SECRET_KEY = 'test_secret_key'
    BCRYPT_LOG_ROUNDS = 4 # Faster hashing for tests
    CACHE_TYPE = 'null' # Disable caching for tests
    RATELIMIT_ENABLED = False # Disable rate limiting for tests


class ProductionConfig(Config):
    """Production configuration."""
    FLASK_ENV = 'production'
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') # Must be set in production
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL must be set for production.")
    CACHE_TYPE = os.environ.get('CACHE_TYPE', 'redis') # Use Redis in production
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/1') # Use Redis for rate limiting
```