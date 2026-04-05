```python
from fastapi import FastAPI, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.core.logger import logger
from app.core.exceptions import CustomException
from app.api.v1 import auth, users, merchants, payments, webhooks
from app.middleware.logging import request_logging_middleware
from app.middleware.rate_limiting import setup_rate_limiter, rate_limit_middleware
from app.core.dependencies import get_redis_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown events.
    """
    logger.info("Starting up application...")
    # Initialize DB (create tables if they don't exist and run migrations logic)
    await init_db()
    
    # Initialize Redis for caching and rate limiting
    redis_client = await get_redis_client()
    if redis_client:
        await setup_rate_limiter(redis_client)
        logger.info("Redis client and rate limiter initialized.")
    else:
        logger.warning("Could not connect to Redis. Caching and rate limiting will be disabled.")

    logger.info("Application startup complete.")
    yield
    logger.info("Shutting down application...")
    # Close Redis connection if necessary
    if redis_client:
        await redis_client.close()
        logger.info("Redis client closed.")
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.PROJECT_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# --- Middleware ---
app.middleware("http")(request_logging_middleware)
app.middleware("http")(rate_limit_middleware)

# --- Exception Handlers ---
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP Error: {exc.status_code} - {exc.detail} for URL: {request.url}", extra={"request_id": request.state.request_id})
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    logger.error(f"Custom Error: {exc.name} - {exc.message} for URL: {request.url}", extra={"request_id": request.state.request_id})
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "name": exc.name},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled Error: {exc} for URL: {request.url}", extra={"request_id": request.state.request_id}, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred."},
    )

# --- API Routers ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(merchants.router, prefix="/api/v1/merchants", tags=["Merchants"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])

# --- Frontend (Minimal Example) ---
templates = Jinja2Templates(directory="app/frontend/templates")
app.mount("/static", StaticFiles(directory="app/frontend/static"), name="static")

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "project_name": settings.PROJECT_NAME})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )
```