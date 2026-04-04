import asyncio
import pytest
from httpx import AsyncClient
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.core.config import settings
from app.db.base_class import Base # Make sure all models are imported implicitly
from app.db.session import get_db
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate

# Override test settings for a clean test database and Redis
settings.DATABASE_URL = "postgresql+asyncpg://testuser:testpassword@localhost/testdb"
settings.REDIS_URL = "redis://localhost:6379/1" # Use DB 1 for tests

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def async_engine():
    """Provide a SQLAlchemy async engine for the test session."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()

@pytest.fixture(scope="session")
async def prepare_database(async_engine):
    """Create and drop all tables for the test database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def db_session(prepare_database, async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh database session for each test function."""
    AsyncTestingSessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with AsyncTestingSessionLocal() as session:
        # Before yielding, ensure all tables are created and then cleaned.
        # This is more robust for function scope.
        await session.begin() # Start a transaction
        yield session
        await session.rollback() # Rollback all changes after test to clean up
    
    # After all tests, explicitly ensure the test database is clean by dropping all tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all) # Recreate empty tables for next session

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an `AsyncClient` for testing FastAPI endpoints."""
    # Override get_db dependency to use the test session
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Initialize FastAPILimiter with a clean Redis instance for each test run if needed
    # For robustness, we might want to clear Redis DB1 before tests as well.
    from app.core.caching import redis_client, connect_redis, disconnect_redis, get_redis_client
    if redis_client: # If already connected from previous test runs
        await redis_client.flushdb(target_db=settings.REDIS_DB)
    else:
        await connect_redis() # Ensure connection is made
    
    from fastapi_limiter import FastAPILimiter
    if FastAPILimiter.redis is None: # Only init if not already initialized
        await FastAPILimiter.init(get_redis_client())

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Clean up FastAPILimiter and Redis after tests
    if FastAPILimiter.redis:
        await FastAPILimiter.redis.close()
        FastAPILimiter.redis = None # Reset
    await disconnect_redis() # Disconnect from Redis

@pytest.fixture(scope="function")
async def superuser_token_headers(client: AsyncClient, db_session: AsyncSession):
    """Fixture to get authentication headers for a superuser."""
    user_in = UserCreate(
        username="testadmin",
        email="testadmin@example.com",
        password="testpassword",
        is_superuser=True,
    )
    user = await crud_user.create(db_session, obj_in=user_in)
    
    login_data = {
        "username": "testadmin@example.com",
        "password": "testpassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, user # Return user object as well for ID checks

@pytest.fixture(scope="function")
async def regular_user_token_headers(client: AsyncClient, db_session: AsyncSession):
    """Fixture to get authentication headers for a regular user."""
    user_in = UserCreate(
        username="testuser",
        email="testuser@example.com",
        password="testpassword",
        is_superuser=False,
    )
    user = await crud_user.create(db_session, obj_in=user_in)
    
    login_data = {
        "username": "testuser@example.com",
        "password": "testpassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, user
```