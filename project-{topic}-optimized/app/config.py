import os

class Config:
    """Base configuration class."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'a_very_secret_default_key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'super_secret_jwt_key')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES = 2592000 # 30 days
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RATE_LIMIT_STORAGE_URI = os.getenv('RATE_LIMIT_STORAGE_URI', 'redis://localhost:6379/1')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    API_TITLE = "E-commerce Backend API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/api/docs"
    OPENAPI_SWAGGER_UI_PATH = "/swagger-ui"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/ecommerce_db_dev')
    FLASK_ENV = 'development'


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/ecommerce_db_test')
    JWT_ACCESS_TOKEN_EXPIRES = 60 # Shorter expiry for tests
    CACHE_TYPE = "NullCache" # Disable caching for tests
    RATE_LIMIT_STORAGE_URI = "memory://" # Use in-memory for tests
    BCRYPT_LOG_ROUNDS = 4 # Faster hashing for tests
    FLASK_ENV = 'testing'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') # Must be set in production env
    FLASK_ENV = 'production'
    # Consider disabling Swagger UI in production or securing it
    OPENAPI_SWAGGER_UI_PATH = None
    OPENAPI_URL_PREFIX = None


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
}