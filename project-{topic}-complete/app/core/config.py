```python
import os
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Pydantic-settings automatically handles .env files.
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    PROJECT_NAME: str = "DataVizSystem"
    PROJECT_VERSION: str = "1.0.0"

    API_V1_STR: str = "/api/v1"

    # Database settings
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "" # This will be set by _build_database_url if not provided

    # JWT settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Admin user credentials for seeding
    FIRST_SUPERUSER_EMAIL: str = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "adminpassword"

    # CORS settings
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Redis for Caching and Rate Limiting
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = "" # This will be set by _build_redis_url if not provided

    # Environment
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.DATABASE_URL:
            self.DATABASE_URL = self._build_database_url()
        if not self.REDIS_URL:
            self.REDIS_URL = self._build_redis_url()

    def _build_database_url(self) -> str:
        """Constructs the database URL from individual components."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def _build_redis_url(self) -> str:
        """Constructs the Redis URL."""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


# Initialize settings
settings = Settings()

# Ensure SECRET_KEY is set in a production environment
if settings.ENVIRONMENT == "production" and not settings.SECRET_KEY:
    raise ValueError("SECRET_KEY must be set in production environment")

# Configure logging
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "formatter": "standard",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        "root": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.access": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "sqlalchemy": {
            "handlers": ["console"],
            "level": "WARNING", # Set to INFO for debugging SQL queries
            "propagate": False,
        },
    },
}
```