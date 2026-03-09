from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Literal

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Pydantic's BaseSettings allows for environment variables
    to override default values.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True # Ensure environment variable names are case-sensitive
    )

    APP_NAME: str = Field("Task Management Backend", description="Name of the application")
    DEBUG: bool = Field(False, description="Enable debug mode")
    ENVIRONMENT: Literal["development", "testing", "production"] = Field("development", description="Current environment")
    HOST: str = Field("0.0.0.0", description="Host to run the application on")
    PORT: int = Field(8000, description="Port to run the application on")

    # Database settings
    DATABASE_URL: str = Field(..., description="PostgreSQL database connection URL")

    # JWT settings
    SECRET_KEY: str = Field(..., description="Secret key for JWT token signing")
    ALGORITHM: str = Field("HS256", description="Algorithm for JWT token signing")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, description="Access token expiration time in minutes")
    REFRESH_TOKEN_EXPIRE_MINUTES: int = Field(10080, description="Refresh token expiration time in minutes (7 days)")

    # Redis settings for caching and rate limiting
    REDIS_URL: str = Field(..., description="Redis connection URL")

    # Logging settings
    LOG_LEVEL: str = Field("INFO", description="Minimum logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)")

    # Additional settings can be added here as needed
    # For example, external service URLs, API keys, etc.

settings = Settings()

# Example of how to use settings:
# if settings.DEBUG:
#     print("Debug mode is enabled")
# print(f"Database URL: {settings.DATABASE_URL}")
```

```