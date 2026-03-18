```python
import pytest
from httpx import AsyncClient
from uuid import UUID

from app.core.config import settings
from app.schemas.user import UserCreate, UserUpdate

API_V1_STR = settings.API_V1_STR


@pytest.mark.asyncio
async def test_create_user_by_superuser(client: AsyncClient, superuser_token_headers: dict[str, str]):
    """Test creating a new user by a superuser."""
    user_in = UserCreate(email="newuser@example.com", password="securepassword123")
    response = await client.post(
        f"{API_V1_STR}/users/",
        json=user_in.model_dump(),
        headers=superuser_token_headers,
    )
    assert response.status_code == 201
    created_user = response.json()
    assert created_user["email"] == user_in.email
    assert "id" in created_user
    assert "hashed_password" not in created_user # Should not expose hash


@pytest.mark.asyncio
async def test_create_user_without_superuser(client: AsyncClient, normal_user_token_headers: dict[str, str]):
    """Test creating a new user by a non-superuser (should fail)."""
    user_in = UserCreate(email="anotheruser@example.com", password="securepassword123")
    response = await client.post(
        f"{API_V1_STR}/users/",
        json=user_in.model_dump(),
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403 # Forbidden


@pytest.mark.asyncio
async def test_read_users_by_superuser(client: AsyncClient, superuser_token_headers: dict[str, str]):
    """Test retrieving all users by a superuser."""
    response = await client.get(
        f"{API_V1_STR}/users/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1 # At least the seeded admin user
    assert any(user["email"] == settings.FIRST_SUPERUSER_EMAIL for user in users)


@pytest.mark.asyncio
async def test_read_users_without_superuser(client: AsyncClient, normal_user_token_headers: dict[str, str]):
    """Test retrieving all users by a non-superuser (should fail)."""
    response = await client.get(
        f"{API_V1_STR}/users/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403 # Forbidden


@pytest.mark.asyncio
async def test_read_user_me(client: AsyncClient, normal_user_token_headers: dict[str, str]):
    """Test reading the current authenticated user's profile."""
    response = await client.get(
        f"{API_V1_STR}/users/me",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == "testuser@example.com" # From normal_user_token_headers fixture


@pytest.mark.asyncio
async def test_update_user_me(client: AsyncClient, normal_user_token_headers: dict[str, str]):
    """Test updating the current authenticated user's profile."""
    update_data = UserUpdate(first_name="Test", last_name="User", password="newpassword123")
    response = await client.put(
        f"{API_V1_STR}/users/me",
        json=update_data.model_dump(exclude_unset=True),
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["first_name"] == "Test"
    assert updated_user["last_name"] == "User"

    # Verify password update by trying to login with new password
    login_data = {
        "username": updated_user["email"],
        "password": "newpassword123",
    }
    login_response = await client.post(f"{API_V1_STR}/auth/access-token", data=login_data)
    assert login_response.status_code == 200


@pytest.mark.asyncio
async def test_read_user_by_id_by_superuser(client: AsyncClient, superuser_token_headers: dict[str, str], db):
    """Test reading a specific user by ID as a superuser."""
    # First, get the superuser's ID
    from app.crud.user import user as crud_user
    admin_user = await crud_user.get_by_email(db, settings.FIRST_SUPERUSER_EMAIL)
    assert admin_user is not None

    response = await client.get(
        f"{API_V1_STR}/users/{admin_user.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == settings.FIRST_SUPERUSER_EMAIL


@pytest.mark.asyncio
async def test_read_user_by_id_without_superuser(client: AsyncClient, normal_user_token_headers: dict[str, str], db):
    """Test reading a specific user by ID as a non-superuser (should fail)."""
    # First, get the superuser's ID
    from app.crud.user import user as crud_user
    admin_user = await crud_user.get_by_email(db, settings.FIRST_SUPERUSER_EMAIL)
    assert admin_user is not None

    response = await client.get(
        f"{API_V1_STR}/users/{admin_user.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403 # Forbidden


@pytest.mark.asyncio
async def test_delete_user_by_superuser(client: AsyncClient, superuser_token_headers: dict[str, str], db):
    """Test deleting a user by a superuser."""
    # Create a dummy user to delete
    from app.crud.user import user as crud_user
    from app.schemas.user import UserCreate
    user_to_delete_in = UserCreate(email="todelete@example.com", password="deletepass")
    user_to_delete = await crud_user.create(db, obj_in=user_to_delete_in)

    response = await client.delete(
        f"{API_V1_STR}/users/{user_to_delete.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    deleted_user = response.json()
    assert deleted_user["email"] == user_to_delete_in.email

    # Verify user is truly deleted
    get_response = await client.get(
        f"{API_V1_STR}/users/{user_to_delete.id}",
        headers=superuser_token_headers,
    )
    assert get_response.status_code == 404 # Not Found
```