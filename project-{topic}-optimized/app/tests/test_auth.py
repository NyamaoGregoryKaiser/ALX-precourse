import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.schemas.user import UserCreate
from app.crud.user import user as crud_user
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, db_session: AsyncSession):
    """Test user registration."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/register", json=user_data)
    assert r.status_code == 201
    created_user = r.json()
    assert created_user["email"] == user_data["email"]
    assert created_user["username"] == user_data["username"]
    assert "id" in created_user

    # Verify user is in DB
    db_user = await crud_user.get_by_email(db_session, email=user_data["email"])
    assert db_user is not None
    assert db_user.email == user_data["email"]

@pytest.mark.asyncio
async def test_create_existing_user_email(client: AsyncClient, db_session: AsyncSession):
    """Test user registration with existing email."""
    user_in = UserCreate(
        username="existing", email="existing@example.com", password="password"
    )
    await crud_user.create(db_session, obj_in=user_in)

    user_data = {
        "username": "anotheruser",
        "email": "existing@example.com",
        "password": "securepassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/register", json=user_data)
    assert r.status_code == 400
    assert "email already exists" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_create_existing_user_username(client: AsyncClient, db_session: AsyncSession):
    """Test user registration with existing username."""
    user_in = UserCreate(
        username="existing_name", email="another_email@example.com", password="password"
    )
    await crud_user.create(db_session, obj_in=user_in)

    user_data = {
        "username": "existing_name",
        "email": "brand_new@example.com",
        "password": "securepassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/register", json=user_data)
    assert r.status_code == 400
    assert "username already exists" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_access_token(client: AsyncClient, db_session: AsyncSession):
    """Test successful token retrieval."""
    user_data = {
        "username": "testuser_login",
        "email": "test@example.com",
        "password": "testpassword",
    }
    await client.post(f"{settings.API_V1_STR}/auth/register", json=user_data)

    login_data = {
        "username": user_data["email"],
        "password": user_data["password"],
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert r.status_code == 200
    token = r.json()
    assert "access_token" in token
    assert token["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_get_access_token_username(client: AsyncClient, db_session: AsyncSession):
    """Test successful token retrieval using username."""
    user_data = {
        "username": "testuser_login_username",
        "email": "test_username@example.com",
        "password": "testpassword",
    }
    await client.post(f"{settings.API_V1_STR}/auth/register", json=user_data)

    login_data = {
        "username": user_data["username"], # Use username
        "password": user_data["password"],
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert r.status_code == 200
    token = r.json()
    assert "access_token" in token
    assert token["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_get_access_token_wrong_password(client: AsyncClient, db_session: AsyncSession):
    """Test token retrieval with wrong password."""
    user_data = {
        "username": "testwrongpass",
        "email": "wrongpass@example.com",
        "password": "correctpassword",
    }
    await client.post(f"{settings.API_V1_STR}/auth/register", json=user_data)

    login_data = {
        "username": user_data["email"],
        "password": "wrongpassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert r.status_code == 400
    assert "incorrect username/email or password" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_get_access_token_non_existent_user(client: AsyncClient):
    """Test token retrieval for non-existent user."""
    login_data = {
        "username": "nonexistent@example.com",
        "password": "anypassword",
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert r.status_code == 400
    assert "incorrect username/email or password" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_test_token_valid(client: AsyncClient, regular_user_token_headers):
    """Test 'test-token' endpoint with a valid token."""
    headers, user = regular_user_token_headers
    r = await client.post(f"{settings.API_V1_STR}/auth/test-token", headers=headers)
    assert r.status_code == 200
    current_user_data = r.json()
    assert current_user_data["id"] == str(user.id)
    assert current_user_data["email"] == user.email

@pytest.mark.asyncio
async def test_test_token_invalid(client: AsyncClient):
    """Test 'test-token' endpoint with an invalid token."""
    headers = {"Authorization": "Bearer invalid_token"}
    r = await client.post(f"{settings.API_V1_STR}/auth/test-token", headers=headers)
    assert r.status_code == 403
    assert "could not validate credentials" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_test_token_no_token(client: AsyncClient):
    """Test 'test-token' endpoint with no token."""
    r = await client.post(f"{settings.API_V1_STR}/auth/test-token")
    assert r.status_code == 401 # Missing token
```