```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import text # For checking connection
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Use create_async_engine for async database operations
# echo=True will log all SQL statements to stdout, useful for debugging
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Configure the async session maker
# expire_on_commit=False prevents objects from being detached after commit,
# which can lead to issues with lazy loading in async contexts.
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False # Important for async ORM
)

# Base class for declarative models
# Moved to models/base.py to avoid circular imports and better structure
Base = declarative_base()

async def init_db():
    """
    Initializes the database connection.
    This can include creating tables if not using migrations (not recommended for production).
    """
    logger.info("Initializing database...")
    try:
        # Check database connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successful.")
    except Exception as e:
        logger.error(f"Could not connect to database: {e}")
        # In a real app, you might want to exit or retry

async def get_db() -> AsyncSession:
    """
    Dependency to provide a database session.
    Yields a session and ensures it's closed after use.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```