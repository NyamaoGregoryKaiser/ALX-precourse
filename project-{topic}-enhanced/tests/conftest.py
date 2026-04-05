```python
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, get_redis_client
import redis.asyncio as redis

# Override the database URL for tests
TEST_DATABASE_URL = settings.TEST_DATABASE_URL

# Create a test engine and sessionmaker
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

async def override_get_db():
    """Override dependency for database session during tests."""
    async with TestingSessionLocal() as session:
        yield session

async def override_get_redis_client():
    """Override Redis client for tests to connect to test Redis instance."""
    client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=1,  # Use a different DB for tests to avoid conflict with main app
        password=settings.REDIS_PASSWORD or None,
        decode_responses=True
    )
    try:
        await client.ping()
        yield client
    except redis.exceptions.ConnectionError:
        print("Warning: Could not connect to Redis for tests. Skipping Redis-dependent features.")
        yield None
    finally:
        await client.close()


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_redis_client] = override_get_redis_client

@pytest.fixture(scope="session")
def event_loop():
    """Forces pytest-asyncio to use a single event loop for the entire session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Create and drop test database tables for the entire test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all) # Clean slate
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def db_session():
    """Provides a fresh, isolated database session for each test function."""
    async with TestingSessionLocal() as session:
        yield session
        # Rollback all changes after each test
        await session.rollback()

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession):
    """Provides an asynchronous test client for FastAPI."""
    # The override_get_db fixture already ensures db_session is used
    # This just ensures a clean client for each test
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def create_user(db_session: AsyncSession):
    """Factory fixture to create users for tests."""
    async def _create_user(username: str, email: str, password: str, role: UserRole = UserRole.MERCHANT, is_active: bool = True):
        hashed_password = get_password_hash(password)
        user = User(username=username, email=email, hashed_password=hashed_password, role=role, is_active=is_active)
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    return _create_user

@pytest.fixture
async def create_admin_user(create_user):
    return await create_user("admin_test", "admin_test@example.com", "securepass", UserRole.ADMIN)

@pytest.fixture
async def create_merchant_user(create_user):
    return await create_user("merchant_test", "merchant_test@example.com", "securepass", UserRole.MERCHANT)

@pytest.fixture
async def create_token(create_user):
    """Factory fixture to create a JWT token for a given user."""
    async def _create_token(username: str, email: str, password: str, role: UserRole = UserRole.MERCHANT):
        await create_user(username, email, password, role)
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.post("/api/v1/auth/token", data={"username": username, "password": password})
            return response.json()["access_token"]
    return _create_token

@pytest.fixture
async def admin_token(create_admin_user, client):
    user = create_admin_user # This will be the actual User object returned by the fixture
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user.username, "password": "securepass"}
    )
    return response.json()["access_token"]

@pytest.fixture
async def merchant_token(create_merchant_user, client):
    user = create_merchant_user
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user.username, "password": "securepass"}
    )
    return response.json()["access_token"]

# Override get_current_user for specific test cases if needed
def override_get_current_user_mock(user: User):
    async def _override():
        return user
    return _override
```