```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.schemas.user import UserCreate
from backend.app.crud.user import user as crud_user

@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient, override_get_db: AsyncSession):
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepassword"
    }
    response = await client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

    # Verify user is created in DB
    db_user = await crud_user.get_by_email(override_get_db, email="newuser@example.com")
    assert db_user is not None
    assert db_user.username == "newuser"

@pytest.mark.asyncio
async def test_register_user_duplicate_email(client: AsyncClient, test_user_data: dict):
    # Register first user
    await client.post("/api/v1/auth/register", json=test_user_data)

    # Attempt to register with same email
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_for_access_token_success(client: AsyncClient, test_user_data: dict):
    # First, register the user
    await client.post("/api/v1/auth/register", json=test_user_data)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": test_user_data["email"], "password": test_user_data["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_for_access_token_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "nonexistent@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]
```