from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from tenacity import retry, stop_after_attempt, wait_fixed, before_log
from loguru import logger
import asyncio

# Base class for our SQLAlchemy ORM models
Base = declarative_base()

# Database engine
engine = create_async_engine(
    settings.get_database_url_for_env,
    echo=settings.DEBUG, # Log SQL queries in debug mode
    pool_size=10,        # Max connections in pool
    max_overflow=20,     # Max additional connections when pool is exhausted
    pool_timeout=30,     # seconds to wait for connection
    pool_recycle=3600    # recycle connections after one hour
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False # Ensures objects are not expired after commit
)

@retry(
    stop=stop_after_attempt(5),
    wait=wait_fixed(2),
    before=before_log(logger, logger.INFO),
    reraise=True # Re-raise the last exception if retries fail
)
async def check_db_connection():
    """
    Checks the database connection by attempting to connect.
    Retries up to 5 times with a 2-second delay between attempts.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(  # Use execute for DDL or simple queries
                # For PostgreSQL, SELECT 1; is a common lightweight check
                # For SQLAlchemy 2.0, text() is generally preferred for raw SQL
                # from sqlalchemy import text
                # text("SELECT 1;")
                # However, for a simple connection check, a transaction is enough.
                # A simple statement might be needed if the driver requires it.
                # For asyncpg, a no-op transaction is usually enough.
                # For a true "SELECT 1", you'd use conn.scalar(text("SELECT 1"))
                # But connect() itself attempts connection, so this is primarily for transaction test.
                # Let's add a scalar check for robustness.
                # await conn.scalar(text("SELECT 1")) # Use this for direct SQL check
                # The engine.connect() itself validates the connection.
                # This block mainly ensures async context management works.
                logger.info("Database connection successful.")
                return True # If no exception, connection is successful
            )
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise # Re-raise for retry mechanism

async def get_db():
    """
    Dependency to provide a database session for each request.
    Handles session creation and closing.
    """
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()

# Example: Run connection check at startup (can be called in main.py)
async def startup_db_check():
    logger.info("Attempting to connect to the database...")
    try:
        await check_db_connection()
        logger.info("Database startup check completed successfully.")
    except Exception:
        logger.error("Failed to connect to the database after multiple retries. Exiting.")
        # In a real application, you might want to terminate the application
        # or enter a degraded mode here. For this example, we just log.
```