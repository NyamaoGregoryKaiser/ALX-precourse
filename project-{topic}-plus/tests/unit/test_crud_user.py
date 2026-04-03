import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.crud.user import crud_user
from app.schemas.user import UserCreate, UserUpdate
from app.models.user import User
from app.core.security import verify_password
from typing import AsyncGenerator

# Setup an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(name="test_engine")
async def test_engine_fixture():
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture(name="test_session")
async def test_session_fixture(test_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest.fixture(name="db_fixture")
async def db_fixture_override(test_session: AsyncSession):
    # This fixture overrides the get_db dependency for tests
    # In integration tests, you might use an actual test database.
    # For unit tests focusing on CRUD logic, an in-memory db is fine.
    yield test_session

@pytest.mark.asyncio
async def test_crud_user_create(db_fixture: AsyncSession):
    user_in = UserCreate(email="test@example.com", password="testpassword", full_name="Test User")
    user = await crud_user.create(db_fixture, obj_in=user_in)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.is_active is True
    assert user.is_superuser is False
    assert verify_password("testpassword", user.hashed_password)

@pytest.mark.asyncio
async def test_crud_user_get(db_fixture: AsyncSession):
    user_in = UserCreate(email="get@example.com", password="getpassword")
    created_user = await crud_user.create(db_fixture, obj_in=user_in)

    fetched_user = await crud_user.get(db_fixture, id=created_user.id)
    assert fetched_user is not None
    assert fetched_user.email == created_user.email

    not_found_user = await crud_user.get(db_fixture, id=999)
    assert not_found_user is None

@pytest.mark.asyncio
async def test_crud_user_get_by_email(db_fixture: AsyncSession):
    user_in = UserCreate(email="email@example.com", password="emailpassword")
    await crud_user.create(db_fixture, obj_in=user_in)

    fetched_user = await crud_user.get_by_email(db_fixture, email="email@example.com")
    assert fetched_user is not None
    assert fetched_user.email == "email@example.com"

    not_found_user = await crud_user.get_by_email(db_fixture, email="nonexistent@example.com")
    assert not_found_user is None

@pytest.mark.asyncio
async def test_crud_user_update(db_fixture: AsyncSession):
    user_in = UserCreate(email="update@example.com", password="oldpassword")
    user_obj = await crud_user.create(db_fixture, obj_in=user_in)

    user_update = UserUpdate(full_name="Updated Name", password="newpassword", is_active=False)
    updated_user = await crud_user.update(db_fixture, db_obj=user_obj, obj_in=user_update)

    assert updated_user.full_name == "Updated Name"
    assert updated_user.is_active is False
    assert verify_password("newpassword", updated_user.hashed_password)
    assert not verify_password("oldpassword", updated_user.hashed_password)

    # Update only email
    user_update_email = UserUpdate(email="newemail@example.com")
    updated_user_email = await crud_user.update(db_fixture, db_obj=user_obj, obj_in=user_update_email)
    assert updated_user_email.email == "newemail@example.com"

@pytest.mark.asyncio
async def test_crud_user_remove(db_fixture: AsyncSession):
    user_in = UserCreate(email="delete@example.com", password="deletepassword")
    user_obj = await crud_user.create(db_fixture, obj_in=user_in)

    removed_user = await crud_user.remove(db_fixture, id=user_obj.id)
    assert removed_user is not None
    assert removed_user.email == user_obj.email

    fetched_user = await crud_user.get(db_fixture, id=user_obj.id)
    assert fetched_user is None

@pytest.mark.asyncio
async def test_crud_user_get_multi(db_fixture: AsyncSession):
    await crud_user.create(db_fixture, obj_in=UserCreate(email="user1@example.com", password="p1"))
    await crud_user.create(db_fixture, obj_in=UserCreate(email="user2@example.com", password="p2"))
    await crud_user.create(db_fixture, obj_in=UserCreate(email="user3@example.com", password="p3", is_active=False))

    users = await crud_user.get_multi(db_fixture, skip=0, limit=2)
    assert len(users) == 2

    all_users = await crud_user.get_multi(db_fixture, skip=0, limit=100)
    assert len(all_users) == 3

@pytest.mark.asyncio
async def test_crud_user_get_multi_by_is_active(db_fixture: AsyncSession):
    await crud_user.create(db_fixture, obj_in=UserCreate(email="active1@example.com", password="p1", is_active=True))
    await crud_user.create(db_fixture, obj_in=UserCreate(email="active2@example.com", password="p2", is_active=True))
    await crud_user.create(db_fixture, obj_in=UserCreate(email="inactive1@example.com", password="p3", is_active=False))

    active_users = await crud_user.get_multi_by_is_active(db_fixture, is_active=True)
    assert len(active_users) == 2
    assert all(user.is_active for user in active_users)

    inactive_users = await crud_user.get_multi_by_is_active(db_fixture, is_active=False)
    assert len(inactive_users) == 1
    assert not inactive_users[0].is_active