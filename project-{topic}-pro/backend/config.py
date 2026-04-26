```python
import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr, PostgresDsn

class Settings(BaseSettings):
    # Base settings for the application
    PROJECT_NAME: str = "Enterprise Task Management System"
    API_V1_STR: str = "/api/v1"

    # Database settings
    DATABASE_URL: PostgresDsn = Field(
        ..., env="DATABASE_URL", description="PostgreSQL connection string"
    )
    ASYNC_DATABASE_URL: PostgresDsn = Field(
        ..., env="ASYNC_DATABASE_URL", description="Async PostgreSQL connection string (for SQLAlchemy)"
    )

    # Security settings
    SECRET_KEY: SecretStr = Field(
        ..., env="SECRET_KEY", description="Secret key for JWT encoding/decoding"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for example, adjust as needed

    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Redis settings for caching and rate limiting
    REDIS_URL: str = Field(
        ..., env="REDIS_URL", description="URL for Redis server"
    )

    # Logging settings (can be expanded)
    LOG_LEVEL: str = "INFO"

    # Sentry DSN for error monitoring (optional)
    SENTRY_DSN: Optional[str] = Field(
        None, env="SENTRY_DSN", description="Sentry DSN for error tracking"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```