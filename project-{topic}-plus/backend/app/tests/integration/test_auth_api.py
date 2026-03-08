```python
import pytest
from httpx import AsyncClient
from app.core.config import get_settings
from app.schemas.user import UserPublic
from app.crud.user import crud_user
from app.core.db import AsyncSessionLocal
from app.models.user import User

settings = get_settings()

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient, test_user_data: dict):
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 201
    user_out = UserPublic(**response.json())
    assert user_out.username == test_user_data["username"]
    assert user_out.email == test_user_data["email"]
    assert user_out.is_active is True

    # Verify user is in DB
    async with AsyncSessionLocal() as db:
        user_in_db = await crud_user.get_by_email(db, email=test_user_data["email"])
        assert user_in_db is not None
        assert user_in_db.username == test_user_data["username"]
        assert user_in_db.full_name == test_user_data["full_name"]

@pytest.mark.asyncio
async def test_register_user_duplicate_email(client: AsyncClient, create_test_user: User, test_user_data: dict):
    new_user_data = test_user_data.copy()
    new_user_data["username"] = "anotheruser" # Change username but keep email same
    response = await client.post("/api/v1/auth/register", json=new_user_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

@pytest.mark.asyncio
async def test_register_user_duplicate_username(client: AsyncClient, create_test_user: User, test_user_data: dict):
    new_user_data = test_user_data.copy()
    new_user_data["email"] = "another@example.com" # Change email but keep username same
    response = await client.post("/api/v1/auth/register", json=new_user_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already taken"

@pytest.mark.asyncio
async def test_login_for_access_token(client: AsyncClient, create_test_user: User, test_user_data: dict):
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": test_user_data["username"], "password": test_user_data["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_for_access_token_invalid_credentials(client: AsyncClient, create_test_user: User):
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_test_user.username, "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

@pytest.mark.asyncio
async def test_login_for_access_token_inactive_user(client: AsyncClient, db_session: AsyncSession, create_test_user: User):
    create_test_user.is_active = False
    db_session.add(create_test_user)
    await db_session.commit()
    await db_session.refresh(create_test_user)

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": create_test_user.username, "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"

@pytest.mark.asyncio
async def test_login_rate_limiting(client: AsyncClient, create_test_user: User, test_user_data: dict):
    # This test might be flaky depending on exact timing and CI environment,
    # but the intention is to test the rate limiter.
    # The rate limit is 5 requests per 60 seconds.
    for i in range(5): # First 5 requests should pass (or fail for wrong password)
        response = await client.post(
            "/api/v1/auth/token",
            data={"username": "nonexistent", "password": "wrong"}, # Use wrong credentials to ensure consistent 401
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 401 # Should be 401 for incorrect credentials

    # 6th request should be rate limited
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "nonexistent", "password": "wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 429 # Too Many Requests
    assert "detail" in response.json()
    assert "Rate limit exceeded" in response.json()["detail"]

```