from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Literal, Union

# Define possible environments
Environment = Literal["development", "testing", "production"]

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses Pydantic's BaseSettings for type-safe configuration management.
    """
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core Application Settings
    APP_NAME: str = "Project Management API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Environment = "development"
    DEBUG: bool = False

    # Database Settings
    DATABASE_URL: str
    TEST_DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5433/test_db" # Separate DB for tests
    ASYNC_DATABASE_URL: str # This will be derived or set explicitly for asyncpg
    ASYNC_TEST_DATABASE_URL: str # This will be derived or set explicitly for asyncpg

    # JWT Settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FILE_PATH: str = "app.log"
    LOG_RETENTION_DAYS: int = 7
    LOG_ROTATION_SIZE_MB: int = 10

    # Rate Limiting Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    RATE_LIMIT_DEFAULT: str = "5/minute" # Default rate limit per user

    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:8000", "http://localhost:5173", "http://127.0.0.1:5173"] # Frontend origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"

    @property
    def get_database_url_for_env(self) -> str:
        if self.is_testing:
            return self.ASYNC_TEST_DATABASE_URL
        return self.ASYNC_DATABASE_URL

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure ASYNC_DATABASE_URL and ASYNC_TEST_DATABASE_URL are set
        # Pydantic Settings allows for computed properties or custom init
        if not self.DATABASE_URL.startswith("postgresql+asyncpg"):
            self.ASYNC_DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        else:
            self.ASYNC_DATABASE_URL = self.DATABASE_URL
        
        if not self.TEST_DATABASE_URL.startswith("postgresql+asyncpg"):
            self.ASYNC_TEST_DATABASE_URL = self.TEST_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        else:
            self.ASYNC_TEST_DATABASE_URL = self.TEST_DATABASE_URL


settings = Settings()

# Validate environment specific settings
if settings.is_production:
    # Example: Ensure sensitive settings are not default in production
    assert settings.SECRET_KEY != "YOUR_SUPER_SECRET_KEY", "SECRET_KEY must be changed in production!"
    assert settings.DEBUG is False, "DEBUG should be False in production!"
```