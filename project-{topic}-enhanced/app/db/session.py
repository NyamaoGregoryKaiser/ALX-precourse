```python
import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.db.base_class import Base # Ensure Base is imported for metadata

logger = logging.getLogger(__name__)

# Use the test database URL if in testing environment
if settings.TESTING and settings.TEST_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = settings.TEST_DATABASE_URL
    logger.info(f"Using TEST_DATABASE_URL: {SQLALCHEMY_DATABASE_URL}")
else:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
    logger.info(f"Using DATABASE_URL: {SQLALCHEMY_DATABASE_URL}")

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=settings.DEBUG, future=True)

AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False, # Important for keeping objects in session after commit
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get an async database session.
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

async def create_all_tables():
    """
    Creates all tables defined in Base.metadata.
    Use with caution, primarily for testing or initial setup before Alembic.
    """
    logger.info("Creating all database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("All database tables created.")

async def drop_all_tables():
    """
    Drops all tables defined in Base.metadata.
    Use with extreme caution, primarily for testing.
    """
    logger.warning("Dropping all database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All database tables dropped.")
```