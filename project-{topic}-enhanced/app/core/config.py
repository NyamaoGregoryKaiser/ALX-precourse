```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        extra='ignore' # Allow extra fields in .env without raising an error
    )

    # FastAPI Application Settings
    APP_NAME: str = "Personal Finance Tracker API"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/v1"

    # Security Settings
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    ALGORITHM: str = "HS256"

    # Database Settings
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: str = "5432"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis Settings
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE_PATH: str = "./app_logs.log"

    # Testing specific settings
    TESTING: bool = False
    TEST_DATABASE_URL: Optional[str] = None # Will be set dynamically for tests

settings = Settings()

if settings.ENVIRONMENT == "testing" and not settings.TESTING:
    # Ensure TESTING is True if environment is set to testing
    # This helps prevent accidental test DB usage in non-test contexts
    settings.TESTING = True

if settings.TESTING and not settings.TEST_DATABASE_URL:
    # For testing, we might want a different database name
    settings.TEST_DATABASE_URL = (
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
        f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/test_{settings.POSTGRES_DB}"
    )
```