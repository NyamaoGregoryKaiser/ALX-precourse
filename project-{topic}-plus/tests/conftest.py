```python
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.db.session import get_db # Import the app's get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.models.user import User
from app.db.models.item import Item
from app.db.models.order import Order, OrderItem, OrderStatus
from app.core.cache import get_redis_client, close_redis_client

# Override DATABASE_URL for testing
TEST_DATABASE_URL = settings.DATABASE_URL.replace(settings.POSTGRES_DB, f"{settings.POSTGRES_DB}_test")
settings.DATABASE_URL = TEST_DATABASE_URL # Update for all tests to use test DB

# Setup a dedicated test engine and session
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Overrides the get_db dependency to use the test database.
    Each test gets a fresh session, and it's rolled back afterwards.
    """
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback() # Rollback all changes after each test
            await session.close()

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    """
    Sets up and tears down the test database once per test session.
    Creates all tables before tests, drops them after tests.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all) # Ensure a clean slate
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function", autouse=True)
async def clear_data_and_reset_db():
    """
    Clears all data and resets the database between each test function.
    This ensures tests are isolated.
    """
    async with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables): # Drop in reverse order to handle foreign keys
            await conn.execute(table.delete())
        # Re-create tables if they were dropped by previous test (unlikely with rollback)
        # Or, just ensure empty state without dropping/creating schemas, if setup_test_db handles schema.
        # If setup_test_db creates/drops all, this fixture ensures data is clear for each test.
    yield
    # Rollback is handled by override_get_db().
    # If using transaction for entire test function and then rollback, this might not be needed.
    # However, explicitly clearing data ensures consistency even if a test doesn't use the db fixture.


@pytest.fixture(scope="session", autouse=True)
async def setup_and_teardown_redis():
    """
    Initializes and closes the Redis client for the test session.
    """
    await get_redis_client()
    yield
    await close_redis_client()


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an asynchronous test client for the FastAPI application.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user(client: AsyncClient) -> User:
    """Fixture to create and return a test user."""
    async with TestingSessionLocal() as session:
        user_data = {
            "email": "test@example.com",
            "hashed_password": get_password_hash("testpassword"),
            "full_name": "Test User",
            "is_active": True,
            "is_admin": False,
        }
        user = User(**user_data)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

@pytest.fixture
async def admin_user(client: AsyncClient) -> User:
    """Fixture to create and return a test admin user."""
    async with TestingSessionLocal() as session:
        user_data = {
            "email": "admin@example.com",
            "hashed_password": get_password_hash("adminpassword"),
            "full_name": "Admin User",
            "is_active": True,
            "is_admin": True,
        }
        admin = User(**user_data)
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        return admin

@pytest.fixture
async def test_user_token(client: AsyncClient, test_user: User) -> str:
    """Fixture to get an access token for the test user."""
    response = await client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": test_user.email, "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"} # For OAuth2PasswordRequestForm
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]

@pytest.fixture
async def admin_user_token(client: AsyncClient, admin_user: User) -> str:
    """Fixture to get an access token for the admin user."""
    response = await client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": admin_user.email, "password": "adminpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]

@pytest.fixture
async def test_item(client: AsyncClient, test_user: User) -> Item:
    """Fixture to create and return a test item belonging to test_user."""
    async with TestingSessionLocal() as session:
        item_data = {
            "name": "Test Item",
            "description": "A wonderful test item.",
            "price": 19.99,
            "owner_id": test_user.id
        }
        item = Item(**item_data)
        session.add(item)
        await session.commit()
        await session.refresh(item)
        return item

@pytest.fixture
async def test_order(client: AsyncClient, test_user: User, test_item: Item) -> Order:
    """Fixture to create a test order for test_user with test_item."""
    async with TestingSessionLocal() as session:
        order_data = {
            "customer_id": test_user.id,
            "shipping_address": "123 Test St, Test City",
            "status": OrderStatus.PENDING,
            "total_amount": test_item.price * 2 # Example total
        }
        order = Order(**order_data)
        session.add(order)
        await session.flush() # Flush to get order.id

        order_item = OrderItem(
            order_id=order.id,
            item_id=test_item.id,
            quantity=2,
            price_at_purchase=test_item.price
        )
        session.add(order_item)
        await session.commit()
        await session.refresh(order)
        await session.refresh(order_item) # Refresh order_item to ensure relationships are loaded
        return order
```