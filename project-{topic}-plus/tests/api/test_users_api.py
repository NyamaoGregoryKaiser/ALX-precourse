```python
import pytest
from httpx import AsyncClient
import uuid

from app.core.config import settings
from app.db.models.user import User
from app.schemas.user import UserRead

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post(
        f"{settings.API_V1_STR}/users/register",
        json={
            "email": "register@example.com",
            "password": "registerpassword",
            "full_name": "Registered User"
        }
    )
    assert response.status_code == 201
    user_data = response.json()
    assert "id" in user_data
    assert user_data["email"] == "register@example.com"
    assert user_data["full_name"] == "Registered User"
    assert user_data["is_active"] is True
    assert user_data["is_admin"] is False
    assert "hashed_password" not in user_data # Hashed password should not be returned

@pytest.mark.asyncio
async def test_register_user_duplicate_email(client: AsyncClient, test_user: User):
    response = await client.post(
        f"{settings.API_V1_STR}/users/register",
        json={
            "email": test_user.email, # Use existing email
            "password": "anotherpassword",
            "full_name": "Duplicate User"
        }
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Email already registered."

@pytest.mark.asyncio
async def test_login_for_access_token(client: AsyncClient, test_user: User):
    response = await client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": test_user.email, "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert "token_type" in token_data
    assert token_data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_for_access_token_invalid_credentials(client: AsyncClient):
    response = await client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": "nonexistent@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."

@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient, test_user: User, test_user_token: str):
    response = await client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    user_data = UserRead(**response.json())
    assert user_data.email == test_user.email
    assert user_data.id == test_user.id
    assert user_data.is_admin is False

@pytest.mark.asyncio
async def test_get_current_user_me_unauthorized(client: AsyncClient):
    response = await client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials."

@pytest.mark.asyncio
async def test_update_user_me(client: AsyncClient, test_user: User, test_user_token: str):
    new_full_name = "Updated Test User"
    response = await client.put(
        f"{settings.API_V1_STR}/users/me",
        json={"full_name": new_full_name},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    user_data = UserRead(**response.json())
    assert user_data.full_name == new_full_name
    assert user_data.email == test_user.email # Email should not change if not provided
    
    # Verify in DB
    get_me_response = await client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert get_me_response.status_code == 200
    assert get_me_response.json()["full_name"] == new_full_name

@pytest.mark.asyncio
async def test_get_user_by_id_admin_only(client: AsyncClient, admin_user_token: str, test_user: User):
    response = await client.get(
        f"{settings.API_V1_STR}/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 200
    user_data = UserRead(**response.json())
    assert user_data.id == test_user.id
    assert user_data.email == test_user.email

@pytest.mark.asyncio
async def test_get_user_by_id_forbidden_for_normal_user(client: AsyncClient, test_user_token: str, admin_user: User):
    response = await client.get(
        f"{settings.API_V1_STR}/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to perform this action."

@pytest.mark.asyncio
async def test_get_user_by_id_not_found(client: AsyncClient, admin_user_token: str):
    non_existent_uuid = uuid.uuid4()
    response = await client.get(
        f"{settings.API_V1_STR}/users/{non_existent_uuid}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == f"User with ID {non_existent_uuid} not found."

@pytest.mark.asyncio
async def test_delete_user_admin_only(client: AsyncClient, admin_user_token: str, test_user: User):
    response = await client.delete(
        f"{settings.API_V1_STR}/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 204
    
    # Verify user is deleted by trying to fetch
    fetch_response = await client.get(
        f"{settings.API_V1_STR}/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert fetch_response.status_code == 404

@pytest.mark.asyncio
async def test_delete_user_forbidden_for_normal_user(client: AsyncClient, test_user_token: str, admin_user: User):
    response = await client.delete(
        f"{settings.API_V1_STR}/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to perform this action."

```