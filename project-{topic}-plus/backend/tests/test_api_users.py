```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.crud.user import user as crud_user

@pytest.mark.asyncio
async def test_read_current_user(authenticated_client: AsyncClient, test_user: User):
    response = await authenticated_client.get("/api/v1/users/me")
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email
    assert response.json()["username"] == test_user.username
    assert response.json()["id"] == test_user.id

@pytest.mark.asyncio
async def test_read_current_user_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_current_user(authenticated_client: AsyncClient, test_user: User, override_get_db: AsyncSession):
    updated_data = {"username": "updateduser", "email": "updated@example.com"}
    response = await authenticated_client.put("/api/v1/users/me", json=updated_data)
    assert response.status_code == 200
    assert response.json()["username"] == "updateduser"
    assert response.json()["email"] == "updated@example.com"

    # Verify in DB
    db_user = await crud_user.get(override_get_db, id=test_user.id)
    assert db_user.username == "updateduser"
    assert db_user.email == "updated@example.com"

@pytest.mark.asyncio
async def test_read_user_by_id(authenticated_client: AsyncClient, test_user: User, second_user: User):
    response = await authenticated_client.get(f"/api/v1/users/{second_user.id}")
    assert response.status_code == 200
    assert response.json()["id"] == second_user.id
    assert response.json()["email"] == second_user.email

@pytest.mark.asyncio
async def test_read_non_existent_user_by_id(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/users/99999")
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_users_list(authenticated_client: AsyncClient, test_user: User, second_user: User):
    response = await authenticated_client.get("/api/v1/users/")
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 2 # At least test_user and second_user
    assert any(u["id"] == test_user.id for u in users)
    assert any(u["id"] == second_user.id for u in users)
```