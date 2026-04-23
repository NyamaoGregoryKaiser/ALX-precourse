```python
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.crud_user import crud_user
from app.schemas.user import UserCreate, UserUpdate

@pytest.mark.asyncio
async def test_read_users_as_superuser(client: AsyncClient, db_session, superuser):
    _, superuser_token = superuser
    response = await client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1 # At least the superuser itself

@pytest.mark.asyncio
async def test_read_users_as_normal_user(client: AsyncClient, test_user):
    _, user_token = test_user
    response = await client.get(
        f"{settings.API_V1_STR}/users/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403 # Only superusers can list all users

@pytest.mark.asyncio
async def test_create_user_by_admin(client: AsyncClient, superuser):
    _, superuser_token = superuser
    new_user_data = {
        "email": "admincreated@example.com",
        "password": "securepassword",
        "full_name": "Admin Created",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post(
        f"{settings.API_V1_STR}/users/",
        json=new_user_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 201
    created_user = response.json()
    assert created_user["email"] == new_user_data["email"]
    assert created_user["full_name"] == new_user_data["full_name"]
    assert created_user["is_superuser"] is False

@pytest.mark.asyncio
async def test_create_user_by_admin_duplicate_email(client: AsyncClient, superuser, seed_data):
    _, superuser_token = superuser
    new_user_data = {
        "email": settings.POSTGRES_USER, # Duplicate email
        "password": "securepassword",
        "full_name": "Admin Created",
        "is_active": True,
        "is_superuser": False
    }
    response = await client.post(
        f"{settings.API_V1_STR}/users/",
        json=new_user_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_user_me(client: AsyncClient, test_user):
    user_obj, user_token = test_user
    response = await client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == user_obj.email

@pytest.mark.asyncio
async def test_update_user_me(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    update_data = {"full_name": "Updated Test User", "email": "updated_testuser@example.com"}
    response = await client.put(
        f"{settings.API_V1_STR}/users/me",
        json=update_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["full_name"] == update_data["full_name"]
    assert updated_user["email"] == update_data["email"]

    # Verify in DB
    user_in_db = await crud_user.get(db_session, id=user_obj.id)
    assert user_in_db.full_name == update_data["full_name"]
    assert user_in_db.email == update_data["email"]

@pytest.mark.asyncio
async def test_update_user_me_duplicate_email(client: AsyncClient, db_session, test_user, superuser):
    user_obj, user_token = test_user
    superuser_obj, _ = superuser # Get existing superuser's email

    update_data = {"email": superuser_obj.email} # Try to change to superuser's email
    response = await client.put(
        f"{settings.API_V1_STR}/users/me",
        json=update_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_user_by_id_as_superuser(client: AsyncClient, superuser, test_user):
    superuser_obj, superuser_token = superuser
    user_obj, _ = test_user
    response = await client.get(
        f"{settings.API_V1_STR}/users/{user_obj.id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == user_obj.id
    assert response.json()["email"] == user_obj.email

@pytest.mark.asyncio
async def test_read_user_by_id_as_normal_user(client: AsyncClient, test_user):
    user_obj, user_token = test_user
    response = await client.get(
        f"{settings.API_V1_STR}/users/{user_obj.id}", # Try to access own ID via admin endpoint
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403 # Not enough permissions

    response = await client.get(
        f"{settings.API_V1_STR}/users/{user_obj.id + 1}", # Try to access another user's ID
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403 # Still not enough permissions

@pytest.mark.asyncio
async def test_update_user_by_admin(client: AsyncClient, db_session, superuser, test_user):
    _, superuser_token = superuser
    user_obj, _ = test_user
    update_data = {"full_name": "Admin Updated User", "is_active": False}
    response = await client.put(
        f"{settings.API_V1_STR}/users/{user_obj.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["full_name"] == update_data["full_name"]
    assert updated_user["is_active"] == update_data["is_active"]

    # Verify in DB
    user_in_db = await crud_user.get(db_session, id=user_obj.id)
    assert user_in_db.full_name == update_data["full_name"]
    assert user_in_db.is_active == update_data["is_active"]

@pytest.mark.asyncio
async def test_delete_user_by_admin(client: AsyncClient, db_session, superuser, test_user):
    _, superuser_token = superuser
    user_obj, _ = test_user

    response = await client.delete(
        f"{settings.API_V1_STR}/users/{user_obj.id}",
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "User deleted successfully"

    # Verify in DB
    user_in_db = await crud_user.get(db_session, id=user_obj.id)
    assert user_in_db is None

@pytest.mark.asyncio
async def test_delete_user_by_admin_not_found(client: AsyncClient, superuser):
    _, superuser_token = superuser
    response = await client.delete(
        f"{settings.API_V1_STR}/users/9999", # Non-existent ID
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]

```