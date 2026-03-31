```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from backend.app.core.config import settings
from backend.app.core.logger import app_logger

DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    async with engine.begin() as conn:
        # For initial setup, consider if you want to create all tables programmatically.
        # Alembic is preferred for migrations in production.
        # await conn.run_sync(Base.metadata.create_all)
        app_logger.info("Database initialized (or migration applied).")

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
```