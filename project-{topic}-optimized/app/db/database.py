import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)

# Determine which database URL to use based on the environment
# For testing, we might want a separate database
if settings.ENVIRONMENT == "test" and settings.ASYNC_TEST_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = settings.ASYNC_TEST_DATABASE_URL
    logger.info(f"Using TEST database URL: {SQLALCHEMY_DATABASE_URL}")
else:
    SQLALCHEMY_DATABASE_URL = settings.ASYNC_DATABASE_URL
    logger.info(f"Using PRODUCTION/DEVELOPMENT database URL: {SQLALCHEMY_DATABASE_URL}")

# Create an async engine for connecting to the database
# `poolclass=NullPool` is often recommended for FastAPI/async applications
# as connections are managed per request, avoiding long-lived connections
# that might interfere with async event loops. However, for high-concurrency
# scenarios, a properly configured connection pool might be beneficial.
# For simplicity and common async patterns, NullPool is a good starting point.
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries if debug is enabled
    poolclass=NullPool,
    connect_args={"server_settings": {"application_name": settings.APP_NAME, "timezone": "UTC"}} # Set application name and timezone for connection
)

# Create an async session maker
# `expire_on_commit=False` prevents objects from being expired after commit,
# allowing them to be accessed outside the session scope if needed (with caution).
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get an async database session.

    This function provides an independent database session for each request,
    ensuring proper transaction management and resource cleanup.
    """
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()
```