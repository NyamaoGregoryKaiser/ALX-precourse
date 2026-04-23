```python
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.schemas.token import Token

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_data):
    # The `seed_data` fixture ensures a superuser exists with settings.POSTGRES_USER/PASSWORD
    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": settings.POSTGRES_USER, "password": settings.POSTGRES_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    token = Token(**response.json())
    assert token.access_token is not None
    assert token.token_type == "bearer"
    assert token.refresh_token is not None

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, seed_data):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session, superuser):
    user_obj, _ = superuser
    user_obj.is_active = False
    db_session.add(user_obj)
    await db_session.commit()
    await db_session.refresh(user_obj)

    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": settings.POSTGRES_USER, "password": settings.POSTGRES_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"

@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    new_user_email = "newuser@example.com"
    new_user_password = "newpassword123"
    response = await client.post(
        f"{settings.API_V1_STR}/auth/signup",
        json={"email": new_user_email, "password": new_user_password, "full_name": "New User"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == new_user_email
    assert response.json()["is_active"] is True
    assert response.json()["is_superuser"] is False

@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient, seed_data):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/signup",
        json={"email": settings.POSTGRES_USER, "password": "somepassword123", "full_name": "Duplicate User"}
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

@pytest.mark.asyncio
async def test_test_token_success(client: AsyncClient, superuser):
    _, access_token = superuser
    response = await client.post(
        f"{settings.API_V1_STR}/auth/test-token",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == settings.POSTGRES_USER

@pytest.mark.asyncio
async def test_test_token_invalid(client: AsyncClient):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/test-token",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

@pytest.mark.asyncio
async def test_refresh_token_success(client: AsyncClient, superuser):
    user_obj, _ = superuser
    
    # First, get a token pair (which includes a refresh token)
    login_response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": user_obj.email, "password": settings.POSTGRES_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert login_response.status_code == 200
    token_data = Token(**login_response.json())
    refresh_token = token_data.refresh_token

    # Use the refresh token to get a new access token
    refresh_response = await client.post(
        f"{settings.API_V1_STR}/auth/refresh-token",
        headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert refresh_response.status_code == 200
    new_token_data = Token(**refresh_response.json())
    assert new_token_data.access_token is not None
    assert new_token_data.access_token != token_data.access_token # Should be a new token
    assert new_token_data.refresh_token is None # Refresh token is usually not re-issued for security

@pytest.mark.asyncio
async def test_refresh_token_invalid_type(client: AsyncClient, superuser):
    # Use an access token where a refresh token is expected
    _, access_token = superuser
    refresh_response = await client.post(
        f"{settings.API_V1_STR}/auth/refresh-token",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert refresh_response.status_code == 403
    assert "Invalid token type: expected refresh" in refresh_response.json()["detail"]

@pytest.mark.asyncio
async def test_refresh_token_expired(client: AsyncClient, db_session, test_user):
    user_obj, _ = test_user
    # Manually create an expired refresh token
    from app.core.security import create_refresh_token
    expired_refresh_token = create_refresh_token({"user_id": user_obj.id}, expires_delta=timedelta(minutes=-1))

    refresh_response = await client.post(
        f"{settings.API_V1_STR}/auth/refresh-token",
        headers={"Authorization": f"Bearer {expired_refresh_token}"}
    )
    assert refresh_response.status_code == 401
    assert "Could not validate refresh token" in refresh_response.json()["detail"]

```