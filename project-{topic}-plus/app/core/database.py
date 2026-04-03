from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool # Use NullPool for asyncpg if not using a session-per-request pattern or for better control

from app.core.config import settings

# Database engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True, # Set to False in production
    future=True,
    poolclass=NullPool # For asyncpg, manage connections explicitly or use a more robust pool like QueuePool if needed
)

# Session factory
async_session = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False, # Prevents objects from expiring after commit
)

# Base class for ORM models
Base = declarative_base()

async def create_db_and_tables():
    """
    Creates all database tables defined by Base.metadata.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def close_db_connection():
    """
    Closes the database engine connection pool.
    """
    if engine:
        await engine.dispose()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to provide a database session.
    Yields a session and ensures it's closed after use.
    """
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()