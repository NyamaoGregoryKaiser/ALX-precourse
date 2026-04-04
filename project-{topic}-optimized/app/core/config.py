import logging
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr, HttpUrl

# Set up logging for this module
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore" # Ignore extra fields not defined in the model
    )

    # --- Application Settings ---
    APP_NAME: str = Field("Mobile Backend API", description="Name of the application.")
    APP_VERSION: str = Field("1.0.0", description="Version of the application.")
    DEBUG: bool = Field(False, description="Enable debug mode.")
    ENVIRONMENT: str = Field("development", description="Application environment (e.g., development, staging, production).")

    # --- Security Settings ---
    SECRET_KEY: SecretStr = Field(..., description="Secret key for JWT encoding/decoding. **MUST BE SET IN PRODUCTION**")
    ALGORITHM: str = Field("HS256", description="Algorithm used for JWT signing.")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, description="Access token expiration time in minutes.")
    REFRESH_TOKEN_EXPIRE_MINUTES: int = Field(10080, description="Refresh token expiration time in minutes (7 days).") # 7 days

    # --- Database Settings (PostgreSQL) ---
    POSTGRES_USER: str = Field("admin", description="PostgreSQL database user.")
    POSTGRES_PASSWORD: SecretStr = Field("admin", description="PostgreSQL database password.")
    POSTGRES_DB: str = Field("mobile_db", description="PostgreSQL database name.")
    POSTGRES_HOST: str = Field("db", description="PostgreSQL database host.")
    POSTGRES_PORT: int = Field(5432, description="PostgreSQL database port.")
    DATABASE_URL: HttpUrl = Field(
        f"postgresql+asyncpg://admin:admin@db:5432/mobile_db",
        description="Full database connection URL. Auto-constructed if not explicitly set."
    )
    # This is for local testing outside of Docker, for CI/CD it will be overridden by environment variable
    TEST_DATABASE_URL: Optional[HttpUrl] = Field(
        f"postgresql+asyncpg://admin:admin@localhost:5432/test_mobile_db",
        description="Test database connection URL."
    )


    # --- Redis Settings ---
    REDIS_HOST: str = Field("redis", description="Redis host.")
    REDIS_PORT: int = Field(6379, description="Redis port.")
    REDIS_DB: int = Field(0, description="Redis database number.")
    CACHE_EXPIRE_SECONDS: int = Field(300, description="Default cache expiration in seconds (5 minutes).")

    # --- Logging Settings ---
    LOG_LEVEL: str = Field("INFO", description="Minimum logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).")
    LOG_FORMAT: str = Field(
        '{"level": "%(levelname)s", "time": "%(asctime)s", "message": "%(message)s", "module": "%(name)s"}',
        description="Logging format string, preferably JSON for structured logging."
    )

    # --- Rate Limiting Settings ---
    RATE_LIMIT_DEFAULT: str = Field("10/minute", description="Default rate limit for endpoints (e.g., '10/minute', '5/second').")


    # --- Derived properties / Pydantic validators ---
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Constructs the async database URL for SQLAlchemy."""
        # Pydantic 2.x handles HttpUrl validation, but returns a URL object.
        # We need the string representation for SQLAlchemy.
        return str(self.DATABASE_URL)

    @property
    def ASYNC_TEST_DATABASE_URL(self) -> Optional[str]:
        """Constructs the async test database URL for SQLAlchemy."""
        return str(self.TEST_DATABASE_URL) if self.TEST_DATABASE_URL else None


# Instantiate settings to be imported throughout the application
settings = Settings()

logger.info(f"Loaded settings for environment: {settings.ENVIRONMENT}")
if settings.DEBUG:
    logger.debug(f"Debug mode is enabled. App Name: {settings.APP_NAME}, Version: {settings.APP_VERSION}")
```