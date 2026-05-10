import os
from typing import List, Optional, Union

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, PostgresDsn

load_dotenv()  # Load environment variables from .env file


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "Performance Monitoring System"
    PROJECT_DESCRIPTION: str = "An enterprise-grade system for monitoring application performance, collecting metrics, and alerting on anomalies."
    API_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-replace-me")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "db")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "perf_monitor_db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None # Will be set below

    # Redis for Caching and Rate Limiting
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_URL: Optional[str] = None # Will be set below

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    if os.getenv("BACKEND_CORS_ORIGINS"):
        BACKEND_CORS_ORIGINS = [
            AnyHttpUrl(x) for x in os.getenv("BACKEND_CORS_ORIGINS", "").split(",")
        ]

    # Server Host & Port
    UVICORN_HOST: str = os.getenv("UVICORN_HOST", "0.0.0.0")
    UVICORN_PORT: int = int(os.getenv("UVICORN_PORT", "8000"))

    # Admin User Defaults (for seeding)
    FIRST_SUPERUSER_EMAIL: str = os.getenv("FIRST_SUPERUSER_EMAIL", "admin@example.com")
    FIRST_SUPERUSER_PASSWORD: str = os.getenv("FIRST_SUPERUSER_PASSWORD", "adminpass")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # Background Tasks / Data Simulation
    DATA_COLLECTION_INTERVAL_SECONDS: int = int(os.getenv("DATA_COLLECTION_INTERVAL_SECONDS", "30"))
    ALERT_EVALUATION_INTERVAL_SECONDS: int = int(os.getenv("ALERT_EVALUATION_INTERVAL_SECONDS", "60"))

    @property
    def ASYNC_SQLALCHEMY_DATABASE_URI(self) -> Optional[PostgresDsn]:
        """
        Generate async PostgreSQL URI from settings.
        """
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=int(self.POSTGRES_PORT),
            path=f"{self.POSTGRES_DB}",
        )
    
    @property
    def SYNC_SQLALCHEMY_DATABASE_URI(self) -> Optional[PostgresDsn]:
        """
        Generate sync PostgreSQL URI from settings (for Alembic).
        """
        return PostgresDsn.build(
            scheme="postgresql",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=int(self.POSTGRES_PORT),
            path=f"{self.POSTGRES_DB}",
        )

    @property
    def REDIS_URL_FULL(self) -> str:
        """
        Generate full Redis connection URL.
        """
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    def __init__(self, **data: Any):
        super().__init__(**data)
        # Set SQLALCHEMY_DATABASE_URI after all other properties are initialized
        self.SQLALCHEMY_DATABASE_URI = self.ASYNC_SQLALCHEMY_DATABASE_URI
        self.REDIS_URL = self.REDIS_URL_FULL


settings = Settings()

```

#### `app/core/database.py`
```python