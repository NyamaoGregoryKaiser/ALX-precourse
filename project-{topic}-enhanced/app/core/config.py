```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "PaymentProcessor"
    PROJECT_DESCRIPTION: str = "A comprehensive payment processing system."
    PROJECT_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = 8000

    DATABASE_URL: str
    TEST_DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5433/test_db" # For testing

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days for example, typically much shorter

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    REDIS_CACHE_TTL_SECONDS: int = 300 # 5 minutes

    # External Payment Gateway (simulated)
    PAYMENT_GATEWAY_API_URL: str = "http://localhost:8001/mock-gateway"
    PAYMENT_GATEWAY_API_KEY: str = "your_gateway_secret_key"
    PAYMENT_GATEWAY_WEBHOOK_SECRET: str = "your_webhook_validation_secret"

    # Webhook delivery configuration
    WEBHOOK_MAX_RETRIES: int = 5
    WEBHOOK_RETRY_DELAY_SECONDS: int = 60 # Initial delay

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
```