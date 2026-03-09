import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi_limiter.depends import RateLimiter
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.config import settings
from app.core.logging_config import setup_logging, logger
from app.core.exceptions import APIException, InternalServerErrorException
from app.utils.caching import init_redis_client, close_redis_client
from app.utils.rate_limiter import init_rate_limiter, close_rate_limiter
from app.api.v1 import auth, users, tasks

# --- Lifespan Events ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the application.
    """
    # Startup
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} in {settings.ENVIRONMENT} mode...")
    await init_redis_client()
    await init_rate_limiter()
    logger.info("Application startup complete.")
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await close_redis_client()
    await close_rate_limiter()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="A comprehensive, production-ready mobile app backend system for task management.",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan # Attach the lifespan context manager
)


# --- Exception Handlers ---
@app.exception_handler(APIException)
async def custom_api_exception_handler(request: Request, exc: APIException):
    """Handles custom API exceptions."""
    logger.warning(f"API Exception caught: {exc.status_code} - {exc.detail} for URL: {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles Pydantic validation errors."""
    logger.warning(f"Validation Error: {exc.errors()} for URL: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Handles all other unhandled exceptions."""
    logger.exception(f"Unhandled Exception: {exc} for URL: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": InternalServerErrorException().detail},
    )

# --- Include API Routers ---
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")

# --- Root Endpoint (Optional) ---
@app.get("/", tags=["Root"], summary="Application Root")
async def read_root():
    return {"message": f"Welcome to {settings.APP_NAME}! Visit /docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    # This block is primarily for local development outside Docker.
    # When running with 'docker-compose up', the 'CMD' in Dockerfile takes precedence.
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG, # Enable auto-reloading in debug mode
        log_level=settings.LOG_LEVEL.lower()
    )
```

```