import pytest
from httpx import AsyncClient
from fastapi import status
from app.api.deps import reusable_oauth2 # To get token URL
from app.core.config import settings

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_normal_user):
    response = await client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": test_normal_user.email, "password": "testpassword"}
    )
    assert response.status_code == status.HTTP_200_OK
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "nonexistent@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session, test_normal_user):
    test_normal_user.is_active = False
    db_session.add(test_normal_user)
    await db_session.commit()
    await db_session.refresh(test_normal_user)

    response = await client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": test_normal_user.email, "password": "testpassword"}
    )
    # The login itself authenticates, then get_current_active_user checks is_active.
    # The endpoint only checks authentication, not activation status.
    # The 'get_current_active_user' dependency would raise HTTP 400.
    # For login, it should still give a token, but subsequent calls will fail.
    assert response.status_code == status.HTTP_200_OK 
    token_data = response.json()
    assert "access_token" in token_data

    # Now try to access a protected endpoint
    auth_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    response_protected = await client.get(f"{settings.API_V1_STR}/users/me", headers=auth_headers)
    assert response_protected.status_code == status.HTTP_400_BAD_REQUEST
    assert response_protected.json()["detail"] == "Inactive user"


@pytest.mark.asyncio
async def test_get_current_user_me_success(client: AsyncClient, normal_user_token, test_normal_user):
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    user_data = response.json()
    assert user_data["email"] == test_normal_user.email
    assert user_data["id"] == test_normal_user.id

@pytest.mark.asyncio
async def test_get_current_user_me_unauthorized(client: AsyncClient):
    response = await client.get(f"{settings.API_V1_STR}/users/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword123",
        "full_name": "New User"
    }
    response = await client.post(
        f"{settings.API_V1_STR}/signup",
        json=user_data
    )
    assert response.status_code == status.HTTP_201_CREATED
    created_user = response.json()
    assert created_user["email"] == user_data["email"]
    assert "hashed_password" not in created_user # Should not expose hashed password

@pytest.mark.asyncio
async def test_register_existing_user(client: AsyncClient, test_normal_user):
    user_data = {
        "email": test_normal_user.email,
        "password": "anotherpassword",
        "full_name": "Duplicate User"
    }
    response = await client.post(
        f"{settings.API_V1_STR}/signup",
        json=user_data
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "The user with this username already exists in the system."
```

#### `tests/integration/test_api_services.py`
```python