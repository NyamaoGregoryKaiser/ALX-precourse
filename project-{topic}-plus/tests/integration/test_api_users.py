import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import Base, async_session, engine
from app.core.deps import get_db, get_current_active_user, get_current_active_superuser
from app.core.security import get_password_hash
from app.models.user import User as DBUser
from app.schemas.user import UserCreate, UserUpdate
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator

# Use an in-memory SQLite database for integration tests (simpler for example)
# In a real project, you'd use a dedicated PostgreSQL test database
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(name="test_db_session")
async def test_db_session_fixture():
    test_engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
    )

    async def override_get_db():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    
    async with TestingSessionLocal() as session:
        yield session

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()

@pytest.fixture(name="client")
async def client_fixture(test_db_session: AsyncSession):
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture(name="superuser_token")
async def superuser_token_fixture(client: AsyncClient, test_db_session: AsyncSession):
    hashed_password = get_password_hash("adminpassword")
    superuser = DBUser(
        email="admin@example.com",
        hashed_password=hashed_password,
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
    )
    test_db_session.add(superuser)
    await test_db_session.commit()
    await test_db_session.refresh(superuser)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": superuser.email, "password": "adminpassword"}
    )
    return response.json()["access_token"]

@pytest.fixture(name="normal_user_token")
async def normal_user_token_fixture(client: AsyncClient, test_db_session: AsyncSession):
    hashed_password = get_password_hash("userpassword")
    normal_user = DBUser(
        email="user@example.com",
        hashed_password=hashed_password,
        full_name="Normal User",
        is_active=True,
        is_superuser=False,
    )
    test_db_session.add(normal_user)
    await test_db_session.commit()
    await test_db_session.refresh(normal_user)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": normal_user.email, "password": "userpassword"}
    )
    return response.json()["access_token"]

@pytest.fixture(name="inactive_user")
async def inactive_user_fixture(test_db_session: AsyncSession):
    hashed_password = get_password_hash("inactivepassword")
    user = DBUser(
        email="inactive@example.com",
        hashed_password=hashed_password,
        full_name="Inactive User",
        is_active=False,
        is_superuser=False,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user

# Helper to get user by email for assertions
async def get_user_by_email(db: AsyncSession, email: str):
    return (await db.execute(select(DBUser).where(DBUser.email == email))).scalar_one_or_none()


# --- Test /api/v1/users/ (GET) ---
@pytest.mark.asyncio
async def test_read_users_as_superuser(client: AsyncClient, superuser_token: str, normal_user_token: str, test_db_session: AsyncSession):
    # Ensure there's more than one user for multi-user test
    response = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2 # superuser + normal_user
    assert any(user["email"] == "admin@example.com" for user in users)
    assert any(user["email"] == "user@example.com" for user in users)

@pytest.mark.asyncio
async def test_read_users_as_normal_user_forbidden(client: AsyncClient, normal_user_token: str):
    response = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "The user doesn't have enough privileges"}

# --- Test /api/v1/users/ (POST) ---
@pytest.mark.asyncio
async def test_create_user_as_superuser_success(client: AsyncClient, superuser_token: str):
    user_data = {"email": "newuser@example.com", "password": "newpassword123", "full_name": "New User"}
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 201
    created_user = response.json()
    assert created_user["email"] == user_data["email"]
    assert created_user["is_superuser"] is False # Default for created user

@pytest.mark.asyncio
async def test_create_user_as_superuser_duplicate_email(client: AsyncClient, superuser_token: str):
    user_data = {"email": "admin@example.com", "password": "newpassword123"} # admin already exists
    response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "The user with this username already exists in the system."}

# --- Test /api/v1/users/me (GET) ---
@pytest.mark.asyncio
async def test_read_user_me_success(client: AsyncClient, normal_user_token: str):
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 200
    user = response.json()
    assert user["email"] == "user@example.com"
    assert user["is_superuser"] is False

@pytest.mark.asyncio
async def test_read_user_me_inactive(client: AsyncClient, inactive_user: DBUser):
    # Get token for inactive user (need to simulate token generation before `get_current_active_user` check)
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": inactive_user.email, "password": "inactivepassword"}
    )
    inactive_token = response.json()["access_token"]

    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {inactive_token}"}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Inactive user"}

# --- Test /api/v1/users/me (PUT) ---
@pytest.mark.asyncio
async def test_update_user_me_success(client: AsyncClient, normal_user_token: str, test_db_session: AsyncSession):
    update_data = {"full_name": "Updated Normal User", "password": "newuserpassword"}
    response = await client.put(
        "/api/v1/users/me",
        json=update_data,
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["full_name"] == "Updated Normal User"

    # Verify password change (cannot directly assert hash from API)
    db_user = (await test_db_session.execute(select(DBUser).where(DBUser.email == updated_user["email"]))).scalar_one()
    assert verify_password("newuserpassword", db_user.hashed_password)

@pytest.mark.asyncio
async def test_update_user_me_cannot_change_superuser_status(client: AsyncClient, normal_user_token: str):
    update_data = {"is_superuser": True}
    response = await client.put(
        "/api/v1/users/me",
        json=update_data,
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "Not enough privileges to change superuser status."}

# --- Test /api/v1/users/{user_id} (GET) ---
@pytest.mark.asyncio
async def test_read_user_by_id_as_superuser(client: AsyncClient, superuser_token: str, normal_user_token: str, test_db_session: AsyncSession):
    # Fetch a user's ID
    user_response = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {normal_user_token}"})
    normal_user_id = user_response.json()["id"]

    response = await client.get(
        f"/api/v1/users/{normal_user_id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    user = response.json()
    assert user["id"] == normal_user_id

@pytest.mark.asyncio
async def test_read_user_by_id_not_found(client: AsyncClient, superuser_token: str):
    response = await client.get(
        "/api/v1/users/9999",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}

# --- Test /api/v1/users/{user_id} (PUT) ---
@pytest.mark.asyncio
async def test_update_user_by_id_as_superuser(client: AsyncClient, superuser_token: str, test_db_session: AsyncSession):
    # Create another user to update
    user_data = {"email": "updateme@example.com", "password": "oldpassword", "full_name": "User To Update"}
    create_response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    user_id_to_update = create_response.json()["id"]

    update_data = {"full_name": "Updated By Admin", "is_active": False}
    response = await client.put(
        f"/api/v1/users/{user_id_to_update}",
        json=update_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["full_name"] == "Updated By Admin"
    assert updated_user["is_active"] is False

    # Check email duplicate for another user
    response_duplicate_email = await client.put(
        f"/api/v1/users/{user_id_to_update}",
        json={"email": "admin@example.com"}, # Admin user email
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response_duplicate_email.status_code == 409
    assert response_duplicate_email.json() == {"detail": "This email is already registered by another user."}


# --- Test /api/v1/users/{user_id} (DELETE) ---
@pytest.mark.asyncio
async def test_delete_user_as_superuser_success(client: AsyncClient, superuser_token: str, test_db_session: AsyncSession):
    # Create a user to delete
    user_data = {"email": "deleteme@example.com", "password": "deletepassword", "full_name": "User To Delete"}
    create_response = await client.post(
        "/api/v1/users/",
        json=user_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    user_id_to_delete = create_response.json()["id"]

    response = await client.delete(
        f"/api/v1/users/{user_id_to_delete}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    deleted_user = response.json()
    assert deleted_user["id"] == user_id_to_delete

    # Verify user is truly deleted
    check_response = await client.get(
        f"/api/v1/users/{user_id_to_delete}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert check_response.status_code == 404

@pytest.mark.asyncio
async def test_delete_own_user_as_superuser_forbidden(client: AsyncClient, superuser_token: str, test_db_session: AsyncSession):
    # Get superuser's own ID
    me_response = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {superuser_token}"})
    superuser_id = me_response.json()["id"]

    response = await client.delete(
        f"/api/v1/users/{superuser_id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Cannot delete your own user account."}

from sqlalchemy.future import select
from app.core.security import verify_password