import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
import asyncio

from app.main import app
from app.core.config import settings
from app.core.database import Base, get_db
from app.crud.user import crud_user
from app.schemas.user import UserCreate
from app.auth.security import create_access_token
from app.core.logger import logger

# Override DB settings for testing
TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_password@localhost:5433/test_db"

@pytest.fixture(scope="session")
def anyio_backend():
    """
    Fixture to allow anyio to manage asynchronous test execution.
    """
    return "asyncio"

@pytest.fixture(scope="session")
async def db_engine():
    """
    Creates an asynchronous test database engine.
    """
    # Use a separate test database URL
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        # Drop and recreate tables for each test session to ensure a clean state
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(db_engine):
    """
    Provides an independent, clean database session for each test function.
    Rolls back changes after each test.
    """
    connection = await db_engine.connect()
    transaction = await connection.begin()
    session_maker = async_sessionmaker(connection, expire_on_commit=False, class_=AsyncSession)
    session = session_maker()

    # Override the app's get_db dependency to use this test session
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    yield session

    await session.close()
    if transaction.is_active:
        await transaction.rollback()
    await connection.close()
    
    app.dependency_overrides.clear() # Clear overrides after test

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncClient:
    """
    Provides an asynchronous test client for FastAPI.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(scope="function")
async def test_admin_user(db_session: AsyncSession):
    """
    Creates an admin user for testing and returns their model.
    """
    admin_user_in = UserCreate(
        email="testadmin@example.com",
        password="testpassword",
        full_name="Test Admin",
        is_active=True,
        is_admin=True,
    )
    admin = await crud_user.create(db_session, obj_in=admin_user_in)
    logger.info(f"Created test admin user: {admin.email}")
    return admin

@pytest.fixture(scope="function")
async def test_normal_user(db_session: AsyncSession):
    """
    Creates a normal user for testing and returns their model.
    """
    normal_user_in = UserCreate(
        email="testuser@example.com",
        password="testpassword",
        full_name="Test User",
        is_active=True,
        is_admin=False,
    )
    user = await crud_user.create(db_session, obj_in=normal_user_in)
    logger.info(f"Created test normal user: {user.email}")
    return user

@pytest.fixture(scope="function")
def admin_token(test_admin_user) -> str:
    """
    Returns a JWT token for the test admin user.
    """
    token = create_access_token(test_admin_user.id)
    return token

@pytest.fixture(scope="function")
def normal_user_token(test_normal_user) -> str:
    """
    Returns a JWT token for the test normal user.
    """
    token = create_access_token(test_normal_user.id)
    return token

```

#### `tests/unit/test_auth.py`
```python