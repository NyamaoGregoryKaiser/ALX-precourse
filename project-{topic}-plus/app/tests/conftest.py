import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
import asyncio
from typing import AsyncGenerator
from loguru import logger
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from app.auth.security import create_access_token # For generating test tokens
from app.schemas.user import User as DBUser, UserRole
from app.core.security import get_password_hash
from app.crud import users as crud_users

# Use a separate test database URL
TEST_DATABASE_URL = settings.ASYNC_TEST_DATABASE_URL

# Setup the test engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

@pytest.fixture(scope="session", autouse=True)
def anyio_backend():
    """Configures AnyIO to use asyncio for all async tests."""
    return "asyncio"

@pytest.fixture(scope="session")
async def db_fixture():
    """
    Fixture to set up and tear down the test database.
    Creates tables, yields, then drops tables.
    """
    logger.info("Setting up test database...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all) # Ensure clean state
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Test database tables created.")

    yield # Tests run here

    logger.info("Tearing down test database...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.info("Test database tables dropped.")


@pytest.fixture(scope="function")
async def db_session(db_fixture) -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a clean, independent database session for each test function.
    Rolls back transaction after each test.
    """
    logger.debug("Creating new DB session for test.")
    connection = await test_engine.connect()
    transaction = await connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Patch the app's get_db dependency to use our test session
    app.dependency_overrides[get_db] = lambda: session

    yield session

    # Rollback and close after test
    await session.close()
    if transaction.is_active:
        await transaction.rollback()
    await connection.close()
    logger.debug("DB session closed and rolled back.")

@pytest.fixture(scope="session")
async def redis_test_client():
    """
    Fixture for a Redis client used in testing (e.g., for rate limiting).
    Clears cache/keys before and after tests.
    """
    logger.info("Connecting to Redis for tests...")
    test_redis = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        encoding="utf-8",
        decode_responses=True
    )
    await test_redis.flushdb() # Start with a clean slate
    await FastAPILimiter.init(test_redis)
    logger.info("FastAPI Limiter initialized for tests.")

    yield test_redis

    logger.info("Disconnecting from Redis for tests and flushing DB...")
    await test_redis.flushdb()
    await test_redis.close()
    await FastAPILimiter.redis.close() # Ensure FastAPILimiter also closes its connection

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession, redis_test_client: redis.Redis):
    """
    Fixture to provide an AsyncClient for making HTTP requests to the FastAPI app.
    Ensures a clean state for each test by resetting the DB session.
    """
    # The db_session fixture already overrides get_db, so app will use the test session.
    # The redis_test_client fixture ensures redis is set up for rate limiting tests.
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture(scope="function")
async def create_test_user(db_session: AsyncSession):
    """Fixture to create a test user and return the DB object."""
    async def _create_user(
        username: str = "testuser",
        email: str = "test@example.com",
        password: str = "password123",
        full_name: str = "Test User",
        is_active: bool = True,
        role: UserRole = UserRole.MEMBER
    ) -> DBUser:
        user_data = {
            "username": username,
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "is_active": is_active,
            "role": role
        }
        user = DBUser(**user_data)
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    return _create_user

@pytest.fixture(scope="function")
async def admin_user(create_test_user) -> DBUser:
    """Fixture for an admin user."""
    return await create_test_user(username="admin_test", email="admin_test@example.com", role=UserRole.ADMIN)

@pytest.fixture(scope="function")
async def manager_user(create_test_user) -> DBUser:
    """Fixture for a manager user."""
    return await create_test_user(username="manager_test", email="manager_test@example.com", role=UserRole.MANAGER)

@pytest.fixture(scope="function")
async def member_user(create_test_user) -> DBUser:
    """Fixture for a regular member user."""
    return await create_test_user(username="member_test", email="member_test@example.com", role=UserRole.MEMBER)

@pytest.fixture(scope="function")
async def inactive_user(create_test_user) -> DBUser:
    """Fixture for an inactive user."""
    return await create_test_user(username="inactive_test", email="inactive_test@example.com", is_active=False)

@pytest.fixture(scope="function")
async def get_auth_headers():
    """Fixture to generate auth headers for a given user ID."""
    async def _get_auth_headers(user_id: int):
        token = create_access_token(data={"sub": str(user_id)})
        return {"Authorization": f"Bearer {token}"}
    return _get_auth_headers

@pytest.fixture(scope="function")
async def admin_auth_headers(admin_user: DBUser, get_auth_headers):
    """Auth headers for an admin user."""
    return await get_auth_headers(admin_user.id)

@pytest.fixture(scope="function")
async def manager_auth_headers(manager_user: DBUser, get_auth_headers):
    """Auth headers for a manager user."""
    return await get_auth_headers(manager_user.id)

@pytest.fixture(scope="function")
async def member_auth_headers(member_user: DBUser, get_auth_headers):
    """Auth headers for a member user."""
    return await get_auth_headers(member_user.id)

@pytest.fixture(scope="function")
async def create_test_project(db_session: AsyncSession):
    """Fixture to create a test project."""
    async def _create_project(
        title: str = "Test Project",
        owner: DBUser = None,
        status: UserRole = UserRole.MEMBER
    ):
        if owner is None:
            # Create a default member if no owner is provided
            owner = await crud_users.create_user(
                db_session, 
                UserCreate(username="proj_owner", email="proj_owner@example.com", password="password", role=UserRole.MEMBER)
            )
        
        project = DBProject(
            title=title,
            description="A description for the test project.",
            owner_id=owner.id,
            status=status
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
        await db_session.refresh(project, attribute_names=["owner"]) # Load owner relationship
        return project
    return _create_project

@pytest.fixture(scope="function")
async def create_test_task(db_session: AsyncSession):
    """Fixture to create a test task."""
    async def _create_task(
        title: str = "Test Task",
        project: DBProject = None,
        assignee: DBUser = None,
        status: TaskStatus = TaskStatus.TO_DO
    ):
        if project is None:
            # Create a default project if none is provided
            owner = await crud_users.create_user(
                db_session, 
                UserCreate(username="task_proj_owner", email="task_proj_owner@example.com", password="password", role=UserRole.MEMBER)
            )
            project = DBProject(
                title="Default Task Project",
                description="Default project for task test.",
                owner_id=owner.id
            )
            db_session.add(project)
            await db_session.commit()
            await db_session.refresh(project)
        
        task = DBTask(
            title=title,
            description="A description for the test task.",
            project_id=project.id,
            assignee_id=assignee.id if assignee else None,
            status=status
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)
        await db_session.refresh(task, attribute_names=["project", "assignee"])
        return task
    return _create_task
```