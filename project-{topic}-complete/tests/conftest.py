```python
import asyncio
import os
import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.db.session import get_db

# Override settings for testing
settings.ENVIRONMENT = "testing"
settings.POSTGRES_DB = f"test_{settings.POSTGRES_DB}_{uuid.uuid4().hex[:8]}" # Unique DB for each test run
settings.DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
    f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)
settings.FIRST_SUPERUSER_EMAIL = "testadmin@example.com"
settings.FIRST_SUPERUSER_PASSWORD = "testpassword"
settings.SECRET_KEY = "test_secret_key_for_jwt_which_is_long_enough_and_random"

# Create a test engine and session
test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

@pytest_asyncio.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Overrides pytest-asyncio default event loop to be session-scoped."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """
    Sets up a temporary test database for the entire test session.
    Drops it afterwards.
    """
    # Create a temporary database for the session
    root_engine = create_async_engine(
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
        f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/postgres", # Connect to 'postgres' db
        isolation_level="AUTOCOMMIT"
    )
    async with root_engine.connect() as conn:
        await conn.execute(f"CREATE DATABASE {settings.POSTGRES_DB}")
        print(f"Created test database: {settings.POSTGRES_DB}")

    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

    # Run seed data after tables are created
    from app.db.init_db import init_db as seed_db
    async with TestingSessionLocal() as session:
        await seed_db(session)
        await session.close()
    print("Initial data seeded.")

    yield # Tests run here

    # Drop the temporary database
    async with test_engine.dispose() as conn: # Dispose existing connections first
        pass
    async with root_engine.connect() as conn:
        await conn.execute(f"DROP DATABASE {settings.POSTGRES_DB} WITH (FORCE)")
        print(f"Dropped test database: {settings.POSTGRES_DB}")
    await root_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides an independent database session for each test function.
    Rolls back transaction after each test.
    """
    async with test_engine.connect() as connection:
        async with connection.begin() as transaction:
            async with TestingSessionLocal(bind=connection) as session:
                # Override the app's get_db dependency to use the test session
                app.dependency_overrides[get_db] = lambda: session
                yield session
                await session.rollback()  # Rollback changes after each test
            await transaction.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an AsyncClient for making requests to the FastAPI app.
    Uses the test database session.
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture(scope="function")
async def superuser_token_headers(client: AsyncClient, db: AsyncSession) -> dict[str, str]:
    """
    Provides authentication headers for a superuser.
    """
    login_data = {
        "username": settings.FIRST_SUPERUSER_EMAIL,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    response = await client.post(f"{settings.API_V1_STR}/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers

@pytest_asyncio.fixture(scope="function")
async def normal_user_token_headers(client: AsyncClient, db: AsyncSession) -> dict[str, str]:
    """
    Provides authentication headers for a regular user.
    Creates a new user for this purpose.
    """
    from app.crud.user import user as crud_user
    from app.schemas.user import UserCreate

    user_in = UserCreate(email="testuser@example.com", password="testpassword123")
    user = await crud_user.create(db, obj_in=user_in)

    login_data = {
        "username": user.email,
        "password": "testpassword123",
    }
    response = await client.post(f"{settings.API_V1_STR}/auth/access-token", data=login_data)
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers

```