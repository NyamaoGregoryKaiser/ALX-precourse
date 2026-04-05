```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from app.core.logger import logger

# Use the appropriate database URL based on environment or settings
DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False) # Set echo=True for SQL logging

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False # To prevent objects from being expired after commit
)

Base = declarative_base()

async def get_db():
    """Dependency for getting a database session."""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """
    Initializes the database. In a production environment, Alembic handles migrations.
    This function is primarily for initial setup or testing where tables might not exist.
    """
    logger.info("Attempting to initialize database...")
    async with engine.begin() as conn:
        # In a real production system, you'd run Alembic migrations separately.
        # This line is primarily for creating tables for initial development/testing
        # without pre-running Alembic, or for ensuring the Base metadata is bound.
        # For production, ensure alembic upgrade head is run.
        # await conn.run_sync(Base.metadata.create_all) # Uncomment for initial creation if not using Alembic from scratch
        logger.info("Database connection established.")
    logger.info("Database initialization complete.")

```