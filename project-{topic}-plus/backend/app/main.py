```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
from contextlib import asynccontextmanager
from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.core.logger import app_logger
from backend.app.middleware.error_handler import ErrorHandlerMiddleware
from backend.app.middleware.logging_middleware import LoggingMiddleware
from backend.app.middleware.rate_limiter import RateLimitMiddleware # Use this if not using fastapi-limiter decorator
from backend.app.api.routers import auth, users, chats, messages, websocket

@asynccontextmanager
async def lifespan(app: FastAPI):
    app_logger.info("Application startup...")
    await init_db()

    # Initialize Redis for FastAPI-Limiter
    try:
        redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_client)
        app_logger.info("FastAPILimiter initialized with Redis.")
    except Exception as e:
        app_logger.error(f"Failed to connect to Redis for FastAPILimiter: {e}")
        # Optionally, raise an exception to prevent app startup if Redis is critical
        # raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Redis connection failed.")

    yield
    app_logger.info("Application shutdown.")
    # Clean up Redis client if necessary
    if FastAPILimiter.redis:
        await FastAPILimiter.redis.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan # Use the lifespan context manager
)

# Add Middleware
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to specific frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Using custom RateLimitMiddleware directly instead of fastapi-limiter decorators
# app.add_middleware(RateLimitMiddleware, limit=100, period=60) # 100 requests per 60 seconds

# Include API routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(chats.router, prefix=settings.API_V1_STR)
app.include_router(messages.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router) # WebSocket router usually doesn't have a /api/v1 prefix

@app.get("/")
async def root():
    return {"message": "Welcome to the Real-time Chat API!"}
```