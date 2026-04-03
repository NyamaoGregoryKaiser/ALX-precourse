from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.endpoints import users, auth, datasets, models, experiments
from app.core.config import settings
from app.core.database import create_db_and_tables, close_db_connection, engine
from app.core.middleware import (
    add_process_time_header,
    rate_limit_middleware,
    catch_exceptions_middleware,
)
from app.core.cache import init_redis_cache, close_redis_cache
from app.core.security import verify_password, get_password_hash
from app.crud.user import crud_user

# --- Application Lifecycle Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the application.
    """
    print("Application startup...")
    # Initialize database
    create_db_and_tables()
    print("Database initialized.")

    # Initialize Redis cache
    await init_redis_cache()
    print("Redis cache initialized.")

    # Create default admin user if not exists
    async with engine.begin() as conn:
        result = await conn.execute(crud_user.model.__table__.select().where(crud_user.model.email == settings.FIRST_SUPERUSER_EMAIL))
        existing_user = result.first()
        if not existing_user:
            print(f"Creating initial superuser: {settings.FIRST_SUPERUSER_EMAIL}")
            hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
            await conn.execute(
                crud_user.model.__table__.insert().values(
                    email=settings.FIRST_SUPERUSER_EMAIL,
                    hashed_password=hashed_password,
                    full_name="Admin User",
                    is_active=True,
                    is_superuser=True,
                )
            )
            print("Superuser created successfully.")
        else:
            print(f"Superuser {settings.FIRST_SUPERUSER_EMAIL} already exists.")

    yield # Application runs
    print("Application shutdown...")
    # Close Redis cache
    await close_redis_cache()
    print("Redis cache closed.")
    # Close database connection (optional with asyncpg, but good practice if using a pool)
    await close_db_connection()
    print("Database connection closed.")

# --- FastAPI Application Instance ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="A comprehensive Machine Learning Utilities System for managing datasets, models, and experiments.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# --- Middleware ---
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.middleware("http")(add_process_time_header)
app.middleware("http")(catch_exceptions_middleware)
app.middleware("http")(rate_limit_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files and Templates ---
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# --- API Routers ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(datasets.router, prefix="/api/v1/datasets", tags=["Datasets"])
app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
app.include_router(experiments.router, prefix="/api/v1/experiments", tags=["Experiments"])

# --- Frontend Routes (Basic Jinja2 UI) ---
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_root(request: Request):
    """Serve the main index page."""
    return templates.TemplateResponse("index.html", {"request": request, "project_name": settings.PROJECT_NAME})

@app.get("/login", response_class=HTMLResponse, include_in_schema=False)
async def login_page(request: Request):
    """Serve the login page."""
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
async def dashboard_page(request: Request):
    """Serve the dashboard page."""
    return templates.TemplateResponse("dashboard.html", {"request": request})

# --- Main entry point for Uvicorn ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)