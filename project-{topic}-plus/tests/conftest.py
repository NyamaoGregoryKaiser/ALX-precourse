```python
"""
Pytest configuration file for ALX-Shop tests.

This module defines fixtures to set up the test environment:
- `test_db`: Provides an isolated, in-memory (or temporary file-based) database for each test.
- `async_client`: Provides an asynchronous test client for making API requests.
- `test_admin_user` and `test_customer_user`: Pre-registered users for authentication tests.
- `admin_auth_headers` and `customer_auth_headers`: Authorization headers for test users.
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db_session # Import Base and get_db_session
from app.core.config import settings
from app.schemas.user import UserCreate, UserRead, UserRole
from app.services.auth_service import register_new_user, authenticate_user
from app.services.user_service import get_user_by_email
from app.core.security import create_access_token
from datetime import timedelta

# Override the database URL for tests to use a dedicated test database
# This ensures tests are isolated and don't affect development data.
TEST_DATABASE_URL = settings.TEST_DATABASE_URL or settings.ASYNC_DATABASE_URL
print(f"Using test database URL: {TEST_DATABASE_URL}")

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """
    Fixture for creating an asynchronous SQLAlchemy engine for tests.
    """
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose() # Close all connections after tests

@pytest_asyncio.fixture(scope="session")
async def test_db_session_factory(test_engine):
    """
    Fixture for creating an asynchronous sessionmaker for tests.
    """
    # Create tables once per session (faster than once per test)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Use sessionmaker with expire_on_commit=False for easier access to relationships
    AsyncSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    yield AsyncSessionLocal

    # Drop all tables after all tests in the session are done
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def test_db(test_db_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """
    Fixture for providing an isolated database session for each test function.
    Rolls back transactions after each test to ensure a clean state.
    """
    async with test_db_session_factory() as session:
        await session.begin_nested() # Start a nested transaction
        yield session
        await session.rollback() # Rollback the nested transaction after test
        await session.close()


@pytest_asyncio.fixture(scope="function")
async def async_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture for providing an asynchronous test client for FastAPI.
    Overrides the app's get_db_session dependency to use the test_db fixture.
    """
    # Override get_db_session to use our test session
    app.dependency_overrides[get_db_session] = lambda: test_db
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides = {} # Clear overrides after test

# --- User fixtures for authentication tests ---

@pytest_asyncio.fixture(scope="function")
async def test_admin_user(test_db: AsyncSession) -> UserRead:
    """Fixture to create and return an admin user."""
    admin_data = UserCreate(
        email="admin_test@alx.com",
        password="testpassword",
        full_name="Test Admin",
        role=UserRole.ADMIN,
        is_active=True
    )
    admin_user = await get_user_by_email(admin_data.email, db=test_db)
    if not admin_user:
        admin_user = await register_new_user(admin_data, db=test_db)
    return admin_user

@pytest_asyncio.fixture(scope="function")
async def test_customer_user(test_db: AsyncSession) -> UserRead:
    """Fixture to create and return a customer user."""
    customer_data = UserCreate(
        email="customer_test@alx.com",
        password="testpassword",
        full_name="Test Customer",
        role=UserRole.CUSTOMER,
        is_active=True
    )
    customer_user = await get_user_by_email(customer_data.email, db=test_db)
    if not customer_user:
        customer_user = await register_new_user(customer_data, db=test_db)
    return customer_user

@pytest_asyncio.fixture(scope="function")
async def inactive_customer_user(test_db: AsyncSession) -> UserRead:
    """Fixture to create and return an inactive customer user."""
    inactive_data = UserCreate(
        email="inactive_test@alx.com",
        password="testpassword",
        full_name="Inactive User",
        role=UserRole.CUSTOMER,
        is_active=False
    )
    inactive_user = await get_user_by_email(inactive_data.email, db=test_db)
    if not inactive_user:
        inactive_user = await register_new_user(inactive_data, db=test_db)
    return inactive_user


@pytest_asyncio.fixture(scope="function")
async def admin_auth_headers(test_admin_user: UserRead) -> dict:
    """Fixture to return authorization headers for the admin user."""
    token = create_access_token(
        data={"sub": test_admin_user.email, "scopes": [test_admin_user.role]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture(scope="function")
async def customer_auth_headers(test_customer_user: UserRead) -> dict:
    """Fixture to return authorization headers for the customer user."""
    token = create_access_token(
        data={"sub": test_customer_user.email, "scopes": [test_customer_user.role]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"Authorization": f"Bearer {token}"}

```