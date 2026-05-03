```python
"""
Integration tests for the Authentication API endpoints.

These tests cover:
- User registration (`POST /api/v1/register`).
- User login and token generation (`POST /api/v1/login`).
- Token refresh (`POST /api/v1/refresh`).
- Retrieving current user details (`GET /api/v1/me`).
- Rate limiting for auth endpoints.
"""

import pytest
from httpx import AsyncClient
from fastapi import status
from app.schemas.user import UserCreate, UserRead, UserRole
from app.schemas.token import Token
from app.core.config import settings
from app.core.security import decode_token, create_access_token, create_refresh_token
from datetime import timedelta
import time

@pytest.mark.asyncio
async def test_register_user_success(async_client: AsyncClient):
    """Test successful user registration."""
    user_data = UserCreate(
        email="register_test@example.com",
        password="testpassword",
        full_name="Register Test User"
    )
    response = await async_client.post("/api/v1/register", json=user_data.model_dump())
    assert response.status_code == status.HTTP_201_CREATED
    user = UserRead.model_validate(response.json())
    assert user.email == user_data.email
    assert user.full_name == user_data.full_name
    assert user.is_active is True
    assert user.role == UserRole.CUSTOMER

@pytest.mark.asyncio
async def test_register_user_duplicate_email(async_client: AsyncClient):
    """Test registration with an already existing email."""
    user_data = UserCreate(
        email="duplicate_test@example.com",
        password="testpassword",
        full_name="Duplicate User"
    )
    # First registration should succeed
    response = await async_client.post("/api/v1/register", json=user_data.model_dump())
    assert response.status_code == status.HTTP_201_CREATED

    # Second registration with same email should fail
    response = await async_client.post("/api/v1/register", json=user_data.model_dump())
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email already registered" in response.json()["message"]

@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient, test_customer_user: UserRead):
    """Test successful user login."""
    response = await async_client.post(
        "/api/v1/login",
        data={"username": test_customer_user.email, "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_200_OK
    token_response = Token.model_validate(response.json())
    assert token_response.access_token is not None
    assert token_response.refresh_token is not None
    assert token_response.token_type == "bearer"

    # Decode and verify the access token
    decoded_access_token = decode_token(token_response.access_token)
    assert decoded_access_token["sub"] == test_customer_user.email
    assert decoded_access_token["token_type"] == "access"
    assert "customer" in decoded_access_token["scopes"]

    # Decode and verify the refresh token
    decoded_refresh_token = decode_token(token_response.refresh_token)
    assert decoded_refresh_token["sub"] == test_customer_user.email
    assert decoded_refresh_token["token_type"] == "refresh"
    assert "customer" in decoded_refresh_token["scopes"]

@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client: AsyncClient):
    """Test login with incorrect password."""
    response = await async_client.post(
        "/api/v1/login",
        data={"username": "nonexistent@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["message"]

@pytest.mark.asyncio
async def test_login_inactive_user(async_client: AsyncClient, inactive_customer_user: UserRead):
    """Test login for an inactive user."""
    response = await async_client.post(
        "/api/v1/login",
        data={"username": inactive_customer_user.email, "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Inactive user" in response.json()["message"]


@pytest.mark.asyncio
async def test_refresh_token_success(async_client: AsyncClient, test_customer_user: UserRead):
    """Test successful token refresh."""
    # First, get a refresh token
    login_response = await async_client.post(
        "/api/v1/login",
        data={"username": test_customer_user.email, "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    refresh_token = login_response.json()["refresh_token"]

    # Then use the refresh token to get a new pair
    refresh_response = await async_client.post("/api/v1/refresh", json={"refresh_token": refresh_token})
    assert refresh_response.status_code == status.HTTP_200_OK
    new_token_response = Token.model_validate(refresh_response.json())
    assert new_token_response.access_token is not None
    assert new_token_response.refresh_token is not None
    assert new_token_response.access_token != login_response.json()["access_token"]
    assert new_token_response.refresh_token != login_response.json()["refresh_token"]

    decoded_new_access_token = decode_token(new_token_response.access_token)
    assert decoded_new_access_token["sub"] == test_customer_user.email
    assert decoded_new_access_token["token_type"] == "access"

@pytest.mark.asyncio
async def test_refresh_token_invalid(async_client: AsyncClient):
    """Test token refresh with an invalid refresh token."""
    response = await async_client.post("/api/v1/refresh", json={"refresh_token": "invalid.jwt.token"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate refresh token" in response.json()["message"]

@pytest.mark.asyncio
async def test_refresh_token_with_access_token(async_client: AsyncClient, test_customer_user: UserRead):
    """Test token refresh fails when an access token is provided instead of refresh token."""
    access_token = create_access_token(data={"sub": test_customer_user.email, "scopes": [test_customer_user.role]})
    response = await async_client.post("/api/v1/refresh", json={"refresh_token": access_token})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Provided token is not a refresh token" in response.json()["message"]

@pytest.mark.asyncio
async def test_read_current_user_success(async_client: AsyncClient, customer_auth_headers: dict, test_customer_user: UserRead):
    """Test retrieving current user details with valid token."""
    response = await async_client.get("/api/v1/me", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    user = UserRead.model_validate(response.json())
    assert user.id == test_customer_user.id
    assert user.email == test_customer_user.email
    assert user.role == test_customer_user.role

@pytest.mark.asyncio
async def test_read_current_user_unauthorized(async_client: AsyncClient):
    """Test retrieving current user details without token."""
    response = await async_client.get("/api/v1/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Not authenticated" in response.json()["message"]

@pytest.mark.asyncio
async def test_auth_rate_limiting(async_client: AsyncClient):
    """Test if login endpoint applies rate limiting."""
    user_data = UserCreate(email="rate_limit_test@example.com", password="testpassword", full_name="Rate Limit Test")
    await async_client.post("/api/v1/register", json=user_data.model_dump()) # Register user first

    # Make more requests than the limit for /login (10 per minute)
    for _ in range(10): # First 10 should succeed (or login fails due to wrong credentials)
        response = await async_client.post(
            "/api/v1/login",
            data={"username": user_data.email, "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED # Expect 401 for wrong pass

    # The 11th request should be rate-limited
    response = await async_client.post(
        "/api/v1/login",
        data={"username": user_data.email, "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Rate limit exceeded" in response.json()["message"]
    assert "Retry-After" in response.headers

    # Wait for the limit to reset and try again
    time.sleep(60)
    response = await async_client.post(
        "/api/v1/login",
        data={"username": user_data.email, "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED # Should succeed after reset

```