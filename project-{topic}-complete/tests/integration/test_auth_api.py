```python
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.schemas.user import UserCreate

API_V1_STR = settings.API_V1_STR


@pytest.mark.asyncio
async def test_login_access_token_superuser(client: AsyncClient):
    """Test login with superuser credentials."""
    login_data = {
        "username": settings.FIRST_SUPERUSER_EMAIL,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    response = await client.post(f"{API_V1_STR}/auth/access-token", data=login_data)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_access_token_invalid_credentials(client: AsyncClient):
    """Test login with incorrect credentials."""
    login_data = {
        "username": "nonexistent@example.com",
        "password": "wrongpassword",
    }
    response = await client.post(f"{API_V1_STR}/auth/access-token", data=login_data)
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


@pytest.mark.asyncio
async def test_test_token_corrected(client: AsyncClient, superuser_token_headers: dict[str, str]):
    """Test the corrected test-token endpoint with a valid token."""
    response = await client.post(
        f"{API_V1_STR}/auth/test-token-corrected",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == settings.FIRST_SUPERUSER_EMAIL
    assert user_data["is_superuser"] is True
    assert "hashed_password" not in user_data


@pytest.mark.asyncio
async def test_test_token_corrected_invalid_token(client: AsyncClient):
    """Test the corrected test-token endpoint with an invalid token."""
    headers = {"Authorization": "Bearer invalid_token"}
    response = await client.post(
        f"{API_V1_STR}/auth/test-token-corrected",
        headers=headers,
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_test_token_corrected_no_token(client: AsyncClient):
    """Test the corrected test-token endpoint with no token."""
    response = await client.post(
        f"{API_V1_STR}/auth/test-token-corrected",
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

```