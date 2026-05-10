from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.api.v1.endpoints import (auth, users, services, metric_types,
                                  metric_records, alert_rules,
                                  alert_notifications)
from app.core.config import settings
from app.core.database import engine, Base
from app.core.logger import logger
from app.middleware.error_handler import CustomExceptionHandlerMiddleware
from app.tasks.scheduler import get_scheduler, setup_scheduler_jobs

# Initialize scheduler globally
scheduler: AsyncIOScheduler = get_scheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Context manager for application startup and shutdown events.
    Handles database initialization, caching, and background tasks.
    """
    logger.info("Application startup event triggered.")

    # 1. Database Initialization
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables checked/created.")

    # 2. Caching Initialization
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    logger.info("FastAPI Cache initialized with Redis.")

    # 3. Background Tasks (APScheduler) Initialization
    setup_scheduler_jobs(scheduler)
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started.")
    else:
        logger.info("APScheduler already running.")

    logger.info("Application startup complete.")
    yield
    logger.info("Application shutdown event triggered.")

    # 4. Background Tasks Shutdown
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down.")

    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.API_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up templates for basic frontend
templates = Jinja2Templates(directory="app/templates")

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Add custom exception handler middleware
app.add_middleware(CustomExceptionHandlerMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API V1 Router
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["Authentication"])
app.include_router(users.router, prefix=settings.API_V1_STR, tags=["Users"])
app.include_router(services.router, prefix=settings.API_V1_STR, tags=["Services"])
app.include_router(metric_types.router, prefix=settings.API_V1_STR, tags=["Metric Types"])
app.include_router(metric_records.router, prefix=settings.API_V1_STR, tags=["Metric Records"])
app.include_router(alert_rules.router, prefix=settings.API_V1_STR, tags=["Alert Rules"])
app.include_router(alert_notifications.router, prefix=settings.API_V1_STR, tags=["Alert Notifications"])


# Root endpoint for basic frontend
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_root(request: Request):
    """
    Renders the main dashboard page.
    """
    return templates.TemplateResponse("index.html", {"request": request, "project_name": settings.PROJECT_NAME})

# Health Check
@app.get("/health", response_model=dict, tags=["Monitoring"])
async def health_check():
    """
    API Health Check endpoint.
    """
    return {"status": "ok", "message": "Performance Monitoring System is running."}

# Log startup message
logger.info(f"{settings.PROJECT_NAME} API started successfully.")
logger.info(f"Access API Docs at: http://localhost:{settings.UVICORN_PORT}{settings.API_V1_STR}/docs")
logger.info(f"Access Frontend at: http://localhost:{settings.UVICORN_PORT}")
```

#### `app/api/v1/endpoints/auth.py`
```python