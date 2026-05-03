import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import users as crud_users
from app.models.user import UserCreate, UserUpdate
from app.schemas.user import User as DBUser, UserRole
from app.core.exceptions import ConflictException, NotFoundException
from app.core.security import verify_password
from faker import Faker

fake = Faker()

@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    user_in = UserCreate(
        username=fake.user_name(),
        email=fake.email(),
        password=fake.password(),
        full_name=fake.name(),
        role=UserRole.MEMBER
    )
    user = await crud_users.create_user(db_session, user_in)

    assert user.id is not None
    assert user.username == user_in.username
    assert user.email == user_in.email
    assert user.full_name == user_in.full_name
    assert user.role == UserRole.MEMBER
    assert user.is_active is True
    assert verify_password(user_in.password, user.hashed_password)

@pytest.mark.asyncio
async def test_create_user_duplicate_email(db_session: AsyncSession):
    email = fake.email()
    user_in_1 = UserCreate(username=fake.user_name(), email=email, password=fake.password())
    await crud_users.create_user(db_session, user_in_1)

    user_in_2 = UserCreate(username=fake.user_name(), email=email, password=fake.password())
    with pytest.raises(ConflictException, match="Email already registered"):
        await crud_users.create_user(db_session, user_in_2)

@pytest.mark.asyncio
async def test_create_user_duplicate_username(db_session: AsyncSession):
    username = fake.user_name()
    user_in_1 = UserCreate(username=username, email=fake.email(), password=fake.password())
    await crud_users.create_user(db_session, user_in_1)

    user_in_2 = UserCreate(username=username, email=fake.email(), password=fake.password())
    with pytest.raises(ConflictException, match="Username already exists"):
        await crud_users.create_user(db_session, user_in_2)

@pytest.mark.asyncio
async def test_get_user_by_id(db_session: AsyncSession):
    user_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    created_user = await crud_users.create_user(db_session, user_in)

    fetched_user = await crud_users.get_user_by_id(db_session, created_user.id)
    assert fetched_user is not None
    assert fetched_user.id == created_user.id
    assert fetched_user.username == created_user.username

@pytest.mark.asyncio
async def test_get_user_by_id_not_found(db_session: AsyncSession):
    user = await crud_users.get_user_by_id(db_session, 999)
    assert user is None

@pytest.mark.asyncio
async def test_get_user_by_email(db_session: AsyncSession):
    email = fake.email()
    user_in = UserCreate(username=fake.user_name(), email=email, password=fake.password())
    created_user = await crud_users.create_user(db_session, user_in)

    fetched_user = await crud_users.get_user_by_email(db_session, email)
    assert fetched_user is not None
    assert fetched_user.email == created_user.email

@pytest.mark.asyncio
async def test_get_user_by_email_not_found(db_session: AsyncSession):
    user = await crud_users.get_user_by_email(db_session, "nonexistent@example.com")
    assert user is None

@pytest.mark.asyncio
async def test_get_user_by_username(db_session: AsyncSession):
    username = fake.user_name()
    user_in = UserCreate(username=username, email=fake.email(), password=fake.password())
    created_user = await crud_users.create_user(db_session, user_in)

    fetched_user = await crud_users.get_user_by_username(db_session, username)
    assert fetched_user is not None
    assert fetched_user.username == created_user.username

@pytest.mark.asyncio
async def test_get_user_by_username_not_found(db_session: AsyncSession):
    user = await crud_users.get_user_by_username(db_session, "nonexistent_username")
    assert user is None

@pytest.mark.asyncio
async def test_get_users(db_session: AsyncSession):
    await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    users = await crud_users.get_users(db_session, skip=0, limit=10)
    assert len(users) >= 2 # Could be more if other tests also created users

@pytest.mark.asyncio
async def test_update_user(db_session: AsyncSession):
    user_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    created_user = await crud_users.create_user(db_session, user_in)

    new_full_name = fake.name()
    new_email = fake.email()
    user_update = UserUpdate(full_name=new_full_name, email=new_email)
    updated_user = await crud_users.update_user(db_session, created_user.id, user_update)

    assert updated_user.full_name == new_full_name
    assert updated_user.email == new_email
    assert updated_user.username == created_user.username # Username should be unchanged
    assert updated_user.id == created_user.id

@pytest.mark.asyncio
async def test_update_user_password(db_session: AsyncSession):
    user_in = UserCreate(username=fake.user_name(), email=fake.email(), password="oldpass")
    created_user = await crud_users.create_user(db_session, user_in)

    new_password = "newsecurepassword"
    user_update = UserUpdate(password=new_password)
    updated_user = await crud_users.update_user(db_session, created_user.id, user_update)

    assert verify_password(new_password, updated_user.hashed_password)

@pytest.mark.asyncio
async def test_update_user_not_found(db_session: AsyncSession):
    user_update = UserUpdate(full_name="Nonexistent User")
    with pytest.raises(NotFoundException, match="User not found"):
        await crud_users.update_user(db_session, 999, user_update)

@pytest.mark.asyncio
async def test_update_user_duplicate_email(db_session: AsyncSession):
    user_1_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    user_1 = await crud_users.create_user(db_session, user_1_in)

    user_2_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    user_2 = await crud_users.create_user(db_session, user_2_in)

    user_update = UserUpdate(email=user_1.email)
    with pytest.raises(ConflictException, match="Email already registered by another user"):
        await crud_users.update_user(db_session, user_2.id, user_update)

@pytest.mark.asyncio
async def test_update_user_duplicate_username(db_session: AsyncSession):
    user_1_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    user_1 = await crud_users.create_user(db_session, user_1_in)

    user_2_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    user_2 = await crud_users.create_user(db_session, user_2_in)

    user_update = UserUpdate(username=user_1.username)
    with pytest.raises(ConflictException, match="Username already exists for another user"):
        await crud_users.update_user(db_session, user_2.id, user_update)


@pytest.mark.asyncio
async def test_delete_user(db_session: AsyncSession):
    user_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password())
    created_user = await crud_users.create_user(db_session, user_in)

    success = await crud_users.delete_user(db_session, created_user.id)
    assert success is True

    deleted_user = await crud_users.get_user_by_id(db_session, created_user.id)
    assert deleted_user is None

@pytest.mark.asyncio
async def test_delete_user_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundException, match="User not found"):
        await crud_users.delete_user(db_session, 999)
```