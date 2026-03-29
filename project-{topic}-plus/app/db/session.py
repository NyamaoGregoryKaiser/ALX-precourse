```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create an asynchronous SQLAlchemy engine
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, future=True)

# Create an asynchronous sessionmaker for database interactions
# expire_on_commit=False prevents objects from being detached after commit,
# allowing their attributes to be accessed later in the same session.
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Dependency to get an asynchronous database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function that provides an independent database session per request.
    The session is automatically closed after the request is processed.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}", exc_info=True)
            await session.rollback()
            raise
        finally:
            await session.close()
            logger.debug("Database session closed.")

async def init_db():
    """
    Initializes the database, creating all tables if they don't exist.
    This is typically run once or during development/testing.
    In a production environment, Alembic migrations are preferred.
    """
    logger.info("Initializing database...")
    async with engine.begin() as conn:
        # Import all models to ensure they are registered with Base.metadata
        from app.db.models import user, item, order
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialization complete.")

Base = declarative_base() # Base class for SQLAlchemy declarative models
```