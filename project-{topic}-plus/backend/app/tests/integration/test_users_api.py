```python
import pytest
from httpx import AsyncClient
from app.schemas.user import UserPublic, UserUpdate
from app.models.user import User
from app.crud.user import crud_user
from app.core.db import AsyncSessionLocal

@pytest.mark.asyncio
async def test_read_users_me(client: AsyncClient, auth_headers: dict, create_test_user: User):
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    user_out = UserPublic(**response.json())
    assert user_out.id == create_test_user.id
    assert user_out.username == create_test_user.username

@pytest.mark.asyncio
async def test_read_users_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert "detail" in response.json()
    assert "Not authenticated" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_user_me(client: AsyncClient, auth_headers: dict, create_test_user: User):
    update_data = {"full_name": "Updated Name", "email": "updated@example.com"}
    response = await client.patch("/api/v1/users/me", headers=auth_headers, json=update_data)
    assert response.status_code == 200
    user_out = UserPublic(**response.json())
    assert user_out.full_name == update_data["full_name"]
    assert user_out.email == update_data["email"]
    assert user_out.username == create_test_user.username # Username should not be updated if not in payload

    # Verify update in DB
    async with AsyncSessionLocal() as db:
        updated_user_in_db = await crud_user.get(db, id=create_test_user.id)
        assert updated_user_in_db.full_name == update_data["full_name"]
        assert updated_user_in_db.email == update_data["email"]

@pytest.mark.asyncio
async def test_update_user_me_invalid_username(client: AsyncClient, auth_headers: dict):
    update_data = {"username": "invalid-user name!"}
    response = await client.patch("/api/v1/users/me", headers=auth_headers, json=update_data)
    assert response.status_code == 422 # Pydantic validation error

@pytest.mark.asyncio
async def test_read_user_by_id(client: AsyncClient, auth_headers: dict, create_test_user: User):
    response = await client.get(f"/api/v1/users/{create_test_user.id}", headers=auth_headers)
    assert response.status_code == 200
    user_out = UserPublic(**response.json())
    assert user_out.id == create_test_user.id
    assert user_out.username == create_test_user.username

@pytest.mark.asyncio
async def test_read_user_by_id_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/users/999", headers=auth_headers) # Non-existent ID
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

@pytest.mark.asyncio
async def test_read_multiple_users(client: AsyncClient, auth_headers: dict, create_test_user: User, db_session: AsyncSession):
    # Create another user
    user2_data = {
        "username": "testuser_two",
        "email": "test2@example.com",
        "password": "password123",
        "full_name": "Test User Two",
    }
    await client.post("/api/v1/auth/register", json=user2_data)

    response = await client.get("/api/v1/users/", headers=auth_headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2 # At least the two users created
    assert any(user["username"] == create_test_user.username for user in users)
    assert any(user["username"] == user2_data["username"] for user in users)

```