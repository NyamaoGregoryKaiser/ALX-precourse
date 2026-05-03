```python
"""
Configuration management for the ALX-Shop application.

This module uses `pydantic-settings` to load environment variables and
provide a structured configuration object for the entire application.
It defines various settings like database connection, JWT secrets, logging levels,
and more.
"""

import os
from typing import List, Optional
from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Uses `SettingsConfigDict` to specify the `.env` file for local development.
    Fields are defined with default values or marked as required.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore" # Ignore extra fields in .env not defined here
    )

    # Project Information
    PROJECT_NAME: str = "ALX-Shop API"
    ENVIRONMENT: str = Field("development", pattern=r"^(development|testing|production)$")

    # Database Configuration
    DATABASE_URL: str = Field(..., env="DATABASE_URL", description="PostgreSQL database connection URL")
    ASYNC_DATABASE_URL: str = Field(..., env="ASYNC_DATABASE_URL", description="Async PostgreSQL database connection URL")

    # JWT Configuration
    SECRET_KEY: str = Field(..., env="SECRET_KEY", description="Secret key for JWT token encoding")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS Configuration
    BACKEND_CORS_ORIGINS: Optional[List[HttpUrl]] = Field(
        None,
        env="BACKEND_CORS_ORIGINS",
        description="Comma-separated list of allowed CORS origins, e.g., http://localhost:3000,https://example.com"
    )
    # Pydantic will automatically parse this string into a list of HttpUrl objects.
    # For example, BACKEND_CORS_ORIGINS="http://localhost:3000,https://www.google.com"

    # Redis Configuration (for caching and rate limiting)
    REDIS_URI: str = Field("redis://localhost:6379/0", env="REDIS_URI", description="Redis connection URI")
    REDIS_PREFIX: str = "alx-shop" # Prefix for Redis keys to avoid collisions

    # Logging Configuration
    LOG_LEVEL: str = Field("INFO", pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    LOG_FORMAT: str = (
        "%(asctime)s - %(name)s - %(levelname)s - "
        "%(funcName)s:%(lineno)d - %(message)s"
    )

    # Test Database Configuration (for integration tests)
    TEST_DATABASE_URL: Optional[str] = Field(
        None,
        env="TEST_DATABASE_URL",
        description="Separate database URL for running tests. Defaults to DATABASE_URL if not set."
    )

    # Admin User Defaults (for seeding)
    DEFAULT_ADMIN_EMAIL: str = Field("admin@alx.com", env="DEFAULT_ADMIN_EMAIL")
    DEFAULT_ADMIN_PASSWORD: str = Field("adminpassword", env="DEFAULT_ADMIN_PASSWORD")
    DEFAULT_ADMIN_FULL_NAME: str = Field("ALX Admin", env="DEFAULT_ADMIN_FULL_NAME")


# Create a single instance of settings to be imported throughout the application
settings = Settings()

# Post-initialization check or adjustment
if settings.TEST_DATABASE_URL:
    # Use the test database for ASYNC_DATABASE_URL if in testing environment and TEST_DATABASE_URL is provided
    # This is a common pattern to ensure tests run against a clean, isolated database.
    settings.ASYNC_DATABASE_URL = settings.TEST_DATABASE_URL
    settings.DATABASE_URL = settings.TEST_DATABASE_URL # Ensure sync also uses test DB if needed for Alembic

```