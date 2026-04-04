import asyncio
import logging
import os
import pytest
from typing import AsyncGenerator, Generator
from datetime import datetime, timedelta
import random

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy_utils import database_exists, create_database, drop_database

from app.core.config import settings
from app.db.base import Base
from app.db.database import get_db
from app.db.models import User, Item, Order, OrderItem, UserRole, OrderStatus
from app.main import app
from app.utils.security import get_password_hash, create_access_token, create_refresh_token

# Configure logging for tests
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

# Override settings for testing environment
@pytest.fixture(scope="session", autouse=True)
def test_environment_setup():
    """
    Sets up environment variables for testing.
    This ensures tests use a dedicated test database and a short token expiration.
    """
    os.environ["ENVIRONMENT"] = "test"
    os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "1"
    os.environ["REFRESH_TOKEN_EXPIRE_MINUTES"] = "2"
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-purposes-only-12345"
    os.environ["DATABASE_URL"] = settings.ASYNC_TEST_DATABASE_URL # Ensure test DB is used
    os.environ["REDIS_HOST"] = "localhost" # Assuming Redis is run locally for tests
    os.environ["REDIS_PORT"] = "6379"
    os.environ["CACHE_EXPIRE_SECONDS"] = "1" # Short cache for tests
    logger.info("Test environment variables set.")

    # Re-import settings after setting environment variables to ensure they are picked up
    from app.core.config import settings as updated_settings
    global settings
    settings = updated_settings
    logger.info(f"Updated settings for tests: {settings.ENVIRONMENT}, {settings.ACCESS_TOKEN_EXPIRE_MINUTES} min access token")


# Database fixtures
@pytest.fixture(scope="session")
def event_loop_policy():
    """
    Ensures that the pytest-asyncio event loop policy is set to 'asyncio'
    for compatibility with SQLAlchemy 2.0+ and asyncpg.
    """
    policy = asyncio.get_event_loop_policy()
    asyncio.set_event_loop_policy(policy)
    return policy

@pytest.fixture(scope="session")
def anyio_backend():
    """
    Configures `anyio` to use `asyncio` backend for async tests.
    """
    return "asyncio"

@pytest.fixture(scope="session")
async def test_db_engine() -> AsyncGenerator:
    """
    Creates and yields an async SQLAlchemy engine for the test database.
    Drops and recreates the test database to ensure a clean state for each test run.
    """
    test_db_url = str(settings.ASYNC_TEST_DATABASE_URL) # Ensure it's string
    
    # Create test database if it doesn't exist
    sync_test_db_url = test_db_url.replace("+asyncpg", "") # For sqlalchemy_utils
    if database_exists(sync_test_db_url):
        logger.warning(f"Test database '{sync_test_db_url}' already exists. Dropping it.")
        drop_database(sync_test_db_url)
    logger.info(f"Creating test database: {sync_test_db_url}")
    create_database(sync_test_db_url)
    
    engine = create_async_engine(test_db_url, echo=False)
    logger.info(f"Test database engine created for URL: {test_db_url}")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    logger.info("Dropping test database after session.")
    await engine.dispose()
    drop_database(sync_test_db_url)
    logger.info(f"Test database '{sync_test_db_url}' dropped.")


@pytest.fixture(scope="function")
async def db_session(test_db_engine: AsyncGenerator) -> AsyncGenerator[AsyncSession, None]:
    """
    Provides an independent, rollback-capable database session for each test function.
    Rolls back all changes after each test to ensure isolation.
    """
    async with test_db_engine.connect() as connection:
        # Begin a non-ORM transaction
        async with connection.begin() as transaction:
            # Bind the session to the connection, not the engine, for isolated transactions
            AsyncSessionLocal = async_sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=connection,
                class_=AsyncSession,
                expire_on_commit=False,
            )
            async with AsyncSessionLocal() as session:
                # Override the app's get_db dependency with this session
                app.dependency_overrides[get_db] = lambda: session
                logger.debug("Database session created for test.")
                yield session
            await transaction.rollback()  # Rollback changes after the test completes
            logger.debug("Database transaction rolled back.")
    app.dependency_overrides = {} # Clear overrides

# API Client fixtures
@pytest.fixture(scope="session")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an asynchronous test client for FastAPI application.
    Starts and stops the application's lifecycle events (startup/shutdown).
    """
    logger.info("Starting FastAPI app for client tests.")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    logger.info("FastAPI app shutdown complete.")

# Data fixtures
@pytest.fixture(scope="function")
async def create_test_user(db_session: AsyncSession):
    """Factory fixture to create a test user."""
    async def _create_test_user(
        email: str = "test@example.com",
        password: str = "testpassword",
        role: UserRole = UserRole.USER,
        is_active: bool = True,
        is_verified: bool = True,
        full_name: str = "Test User"
    ) -> User:
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            role=role,
            is_active=is_active,
            is_verified=is_verified,
            full_name=full_name,
            phone_number=f"+1{random.randint(1000000000, 9999999999)}"
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        logger.debug(f"Created test user: {user.email}")
        return user
    return _create_test_user

@pytest.fixture(scope="function")
async def create_test_admin(create_test_user):
    """Creates an admin user."""
    admin_user = await create_test_user(
        email="admin@example.com",
        password="adminpassword",
        role=UserRole.ADMIN,
        full_name="Admin Test"
    )
    return admin_user

@pytest.fixture(scope="function")
async def active_user(create_test_user):
    """Creates and authenticates an active regular user."""
    return await create_test_user(
        email="activeuser@example.com",
        password="activepassword",
        role=UserRole.USER,
        is_active=True
    )

@pytest.fixture(scope="function")
async def inactive_user(create_test_user):
    """Creates an inactive regular user."""
    return await create_test_user(
        email="inactiveuser@example.com",
        password="inactivepassword",
        role=UserRole.USER,
        is_active=False
    )

@pytest.fixture(scope="function")
async def authenticated_user_token(active_user: User) -> str:
    """Generates an access token for an active regular user."""
    token = create_access_token(
        data={"sub": str(active_user.id), "email": active_user.email, "role": active_user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return token

@pytest.fixture(scope="function")
async def authenticated_admin_token(create_test_admin: User) -> str:
    """Generates an access token for an admin user."""
    token = create_access_token(
        data={"sub": str(create_test_admin.id), "email": create_test_admin.email, "role": create_test_admin.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return token

@pytest.fixture(scope="function")
async def active_user_refresh_token(active_user: User) -> str:
    """Generates a refresh token for an active regular user."""
    token = create_refresh_token(
        data={"sub": str(active_user.id)},
        expires_delta=timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    )
    return token

@pytest.fixture(scope="function")
async def create_test_item(db_session: AsyncSession):
    """Factory fixture to create a test item."""
    async def _create_test_item(
        name: str = "Test Item",
        price: float = 10.0,
        owner: User = None,
        stock_quantity: int = 100,
        is_active: bool = True
    ) -> Item:
        if owner is None:
            # Create a default owner if none provided
            from app.db.crud import user_crud
            users = await user_crud.get_multi(db_session, limit=1, filters={"role": UserRole.USER})
            if not users.data:
                default_owner = await db_session.run_sync(lambda s: s.add(User(email="default_owner@example.com", hashed_password=get_password_hash("defaultpass"), role=UserRole.USER)))
                await db_session.commit()
                await db_session.refresh(default_owner)
            else:
                default_owner = users.data[0]
            owner = default_owner

        item = Item(
            name=name,
            description=f"Description for {name}",
            price=price,
            stock_quantity=stock_quantity,
            is_active=is_active,
            owner_id=owner.id,
            owner=owner # Set relationship for easy access in tests
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)
        logger.debug(f"Created test item: {item.name}")
        return item
    return _create_test_item

@pytest.fixture(scope="function")
async def test_item(create_test_item, active_user):
    """Creates a single test item owned by active_user."""
    return await create_test_item(name="Gadget X", price=99.99, owner=active_user, stock_quantity=50)

@pytest.fixture(scope="function")
async def create_test_order(db_session: AsyncSession, create_test_item, active_user):
    """Factory fixture to create a test order."""
    async def _create_test_order(
        user: User = active_user,
        items_data: list = None, # List of {"item": Item, "quantity": int}
        status: OrderStatus = OrderStatus.PENDING
    ) -> Order:
        if items_data is None:
            # Create default items if none provided
            item1 = await create_test_item(name="Order Item 1", price=10.0, owner=user, stock_quantity=10)
            item2 = await create_test_item(name="Order Item 2", price=20.0, owner=user, stock_quantity=20)
            items_data = [
                {"item": item1, "quantity": 1},
                {"item": item2, "quantity": 2},
            ]
        
        total_amount = sum(d["item"].price * d["quantity"] for d in items_data)

        order = Order(
            user_id=user.id,
            total_amount=total_amount,
            status=status
        )
        db_session.add(order)
        await db_session.flush() # Flush to get order.id

        order_items_objs = []
        for d in items_data:
            order_item = OrderItem(
                order_id=order.id,
                item_id=d["item"].id,
                quantity=d["quantity"],
                price_at_order=d["item"].price
            )
            order_items_objs.append(order_item)
            db_session.add(order_item)
        
        await db_session.commit()
        await db_session.refresh(order)
        # Manually refresh relationships if needed for the test, or rely on ORM loading
        await db_session.refresh(order, attribute_names=['order_items'])
        for oi in order.order_items:
            await db_session.refresh(oi, attribute_names=['item'])

        logger.debug(f"Created test order: {order.id} for user {user.email}")
        return order
    return _create_test_order

@pytest.fixture(scope="function")
async def test_order(create_test_order, active_user):
    """Creates a single test order for active_user."""
    return await create_test_order(user=active_user)
```