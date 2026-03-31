```python
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.crud.user import user as crud_user
from backend.app.schemas.user import UserCreate
from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.user import User
from backend.app.core.config import settings
import fakeredis.aioredis as fakeredis # Mock Redis for tests
from fastapi_limiter import FastAPILimiter

# Override settings for testing
settings.DATABASE_URL = "sqlite+aiosqlite:///./test.db"
settings.REDIS_URL = "redis://localhost:6379/0" # fakeredis will intercept this

# Setup a test database engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestAsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession)

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        session = TestAsyncSessionLocal(bind=connection)
        yield session
        await session.close()
        await connection.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def override_get_db(db_session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    # Use begin_nested to allow rollback after each test without affecting subsequent tests
    # Or simply close and reopen the session for each test for full isolation
    try:
        yield db_session
    finally:
        await db_session.rollback() # Rollback changes made in the test
        # Note: If you need to verify committed data, you might need to rethink this
        # For simplicity, we assume each test runs in isolation with a fresh state (or rolled back)
        # For more complex integration tests, you might re-create tables per test.

@pytest.fixture(scope="session", autouse=True)
async def setup_test_environment():
    # Initialize fakeredis for rate limiting and other redis interactions
    fake_redis_client = fakeredis.FakeRedis()
    await FastAPILimiter.init(fake_redis_client)
    yield
    await FastAPILimiter.redis.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user_data():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword"
    }

@pytest.fixture
async def test_user(db_session: AsyncSession, test_user_data: dict) -> User:
    user_in = UserCreate(**test_user_data)
    user = await crud_user.create(db_session, obj_in=user_in)
    return user

@pytest.fixture
async def test_user_token(test_user: User) -> str:
    return create_access_token(data={"sub": str(test_user.id)})

@pytest.fixture
async def authenticated_client(client: AsyncClient, test_user_token: str) -> AsyncClient:
    client.headers = {"Authorization": f"Bearer {test_user_token}"}
    return client

@pytest.fixture
async def second_user_data():
    return {
        "username": "seconduser",
        "email": "second@example.com",
        "password": "secondpassword"
    }

@pytest.fixture
async def second_user(db_session: AsyncSession, second_user_data: dict) -> User:
    user_in = UserCreate(**second_user_data)
    user = await crud_user.create(db_session, obj_in=user_in)
    return user
```