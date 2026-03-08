```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Load environment variables from .env file
# SettingsConfigDict(env_file=".env", extra="ignore") tells Pydantic to look for .env
# and ignore extra variables not defined in the class.
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Real-Time Chat App"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    # Frontend URLs (for CORS, etc.)
    FRONTEND_URL: str = "http://localhost:3000" # Not directly used by backend but good to have

    class Config:
        env_file = ".env" # Explicitly tell Pydantic to load .env file
        extra = "ignore" # Ignore extra environment variables not defined in the class

@lru_cache()
def get_settings():
    """
    Cached function to get application settings.
    Ensures settings are loaded only once.
    """
    return Settings()

```