from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from starlette.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.database import startup_db_check
from app.middleware.error_handler_middleware import ErrorHandlerMiddleware
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.api.v1 import api_router
from loguru import logger
from app.core.exceptions import generic_exception_handler, http_exception_handler, validation_exception_handler

# For Rate Limiting
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import asyncio

# Setup logging as early as possible
setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    description="A comprehensive Project Management API built with FastAPI.",
    swagger_ui_parameters={"operationsSorter": "method"},
)

# --- Event Handlers ---
@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} starting up...")
    await startup_db_check()

    # Initialize Rate Limiter
    try:
        redis_connection = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            encoding="utf-8",
            decode_responses=True
        )
        await FastAPILimiter.init(redis_connection)
        logger.info(f"FastAPI Limiter initialized with Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis for rate limiting: {e}. Rate limiting will be disabled.")
        # If Redis is crucial, consider raising an exception here to halt startup.

@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"{settings.APP_NAME} shutting down...")
    if FastAPILimiter.redis:
        await FastAPILimiter.redis.close()
        logger.info("FastAPI Limiter Redis connection closed.")

# --- Middleware ---
# Global Error Handling Middleware (should be as high as possible to catch all exceptions)
app.add_middleware(ErrorHandlerMiddleware)

# Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS Middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS enabled for origins: {settings.BACKEND_CORS_ORIGINS}")

# --- Exception Handlers ---
# Override FastAPI's default exception handlers for consistency
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# --- Routes ---
app.include_router(api_router, prefix="/api/v1")

@app.get("/", summary="Root endpoint for API status")
async def root():
    """
    Root endpoint for checking API status.
    """
    return {"message": f"{settings.APP_NAME} is running!", "version": settings.APP_VERSION}

```