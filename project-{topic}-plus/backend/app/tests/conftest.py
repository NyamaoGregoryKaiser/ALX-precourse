```python
import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import Settings, get_settings
from app.core.db import Base, get_db
from app.main import app # Import the FastAPI app instance
from app.models.user import User # Import User model for cleanup/creation
from app.core.security import get_password_hash
from app.crud.user import crud_user

# Override settings for testing
def override_get_settings():
    return Settings(
        DATABASE_URL="postgresql+asyncpg://testuser:testpassword@db:5432/testdb",
        SECRET_KEY="test-secret-key",
        ACCESS_TOKEN_EXPIRE_MINUTES=1, # Shorter for tests
        REDIS_URL="redis://redis:6379/1", # Use a different Redis DB for tests
        FRONTEND_URL="http://test.localhost",
        DEBUG=True
    )

app.dependency_overrides[get_settings] = override_get_settings
test_settings = override_get_settings()

# Setup test database engine and session
test_engine = create_async_engine(test_settings.DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Overrides the get_db dependency to use the test database session.
    """
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """
    Provides the event loop for pytest-asyncio.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    """
    Creates and drops tables in the test database for each test session.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function", autouse=True)
async def cleanup_data_for_function():
    """
    Cleans up data in tables for each test function to ensure isolation.
    """
    async with TestingSessionLocal() as session:
        for table in reversed(Base.metadata.sorted_tables): # Delete from dependent tables first
            await session.execute(table.delete())
        await session.commit()

@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides an async database session for individual test functions.
    """
    async with TestingSessionLocal() as session:
        yield session

@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an asynchronous test client for FastAPI.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture(scope="function")
async def test_user_data():
    """Returns sample user data for creation."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "full_name": "Test User",
    }

@pytest.fixture(scope="function")
async def create_test_user(db_session: AsyncSession, test_user_data: dict) -> User:
    """
    Fixture to create and return a test user in the database.
    """
    user_data = test_user_data.copy()
    user_data["hashed_password"] = get_password_hash(user_data["password"])
    del user_data["password"]
    user = User(**user_data)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def auth_token(client: AsyncClient, create_test_user: User):
    """
    Logs in the test user and returns an access token.
    """
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_test_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture(scope="function")
async def auth_headers(auth_token: str):
    """
    Returns authentication headers for API requests.
    """
    return {"Authorization": f"Bearer {auth_token}"}
```