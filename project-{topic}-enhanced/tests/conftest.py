```python
import asyncio
import pytest
from typing import AsyncGenerator

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.config import settings
from app.db.session import get_db, create_all_tables, drop_all_tables, engine, AsyncSessionLocal
from app.db.base_class import Base

# Override settings for testing
settings.TESTING = True
settings.POSTGRES_DB = f"test_{settings.POSTGRES_DB}" # Ensure test DB name
settings.DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
    f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)
settings.TEST_DATABASE_URL = settings.DATABASE_URL # Point to the same test DB

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """
    Fixture to set up and tear down a fresh test database for the entire test session.
    """
    # Create test database if it doesn't exist (only if running locally without docker)
    # This might require a connection to 'postgres' db first to create the specific test db
    # For Docker Compose, the `db` service usually creates the database specified in POSTGRES_DB.
    # The `docker-compose.yml` ensures the DB is ready, and then `app` service runs migrations.
    # Here, we ensure tables are created/dropped for each test session for a clean slate.
    
    # Ensure tables are dropped and recreated for a clean slate
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield # Run tests

    # Teardown: drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Fixture to provide a clean database session for each test function.
    It rolls back transactions to ensure test isolation.
    """
    connection = await engine.connect()
    transaction = await connection.begin()
    session = AsyncSessionLocal(bind=connection)

    # Override get_db dependency to use our test session
    app.dependency_overrides[get_db] = lambda: session

    yield session

    await transaction.rollback()
    await connection.close()
    app.dependency_overrides = {} # Clear overrides

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture to provide an asynchronous test client for FastAPI.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

```