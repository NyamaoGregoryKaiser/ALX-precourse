```python
"""
Unit tests for the ALX-Shop security utilities.

These tests cover:
- Password hashing and verification.
- JWT token creation and decoding.
- Ensuring tokens handle expiration correctly.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_from_token,
    get_current_active_user,
    get_current_active_admin
)
from app.core.config import settings
from app.core.exceptions import CustomException
from app.schemas.user import UserRead, UserRole
from app.models.user import User as ORMUser # Import ORM user for mocking service layer
from fastapi import HTTPException, status

# --- Password Hashing and Verification Tests ---

def test_get_password_hash():
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 0
    assert hashed_password.startswith("$2b$") # bcrypt hash prefix

def test_verify_password_correct():
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password) is True

def test_verify_password_incorrect():
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)
    assert verify_password("wrongpassword", hashed_password) is False

def test_verify_password_hash_only():
    # Should handle cases where the plain password is also a hash (though unlikely in practice)
    hashed_password = get_password_hash("password")
    assert verify_password(hashed_password, hashed_password) is False # Different hash for the input

# --- JWT Token Creation and Decoding Tests ---

def test_create_access_token():
    data = {"sub": "test@example.com", "scopes": ["user"]}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 0

    decoded_payload = decode_token(token)
    assert decoded_payload["sub"] == "test@example.com"
    assert "exp" in decoded_payload
    assert decoded_payload["token_type"] == "access"
    assert decoded_payload["scopes"] == ["user"]

def test_create_refresh_token():
    data = {"sub": "test@example.com", "scopes": ["user"]}
    token = create_refresh_token(data)
    assert isinstance(token, str)
    assert len(token) > 0

    decoded_payload = decode_token(token)
    assert decoded_payload["sub"] == "test@example.com"
    assert "exp" in decoded_payload
    assert decoded_payload["token_type"] == "refresh"
    assert decoded_payload["scopes"] == ["user"]

def test_decode_token_expired():
    data = {"sub": "test@example.com"}
    expired_token = create_access_token(data, expires_delta=timedelta(seconds=-1)) # Create an already expired token
    
    with pytest.raises(CustomException) as exc_info:
        decode_token(expired_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Signature has expired" in exc_info.value.detail or "Could not validate credentials" in exc_info.value.detail

def test_decode_token_invalid_signature():
    data = {"sub": "test@example.com"}
    token = create_access_token(data)
    
    # Tamper with the token to invalidate signature
    tampered_token = token[:-1] + ('a' if token[-1] != 'a' else 'b')
    
    with pytest.raises(CustomException) as exc_info:
        decode_token(tampered_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail

def test_decode_token_no_sub_raises_exception():
    invalid_token = create_access_token({"scopes": ["user"]}) # Missing 'sub'
    with pytest.raises(CustomException) as exc_info:
        # decode_token will decode it but get_current_user_from_token will fail later
        decode_token(invalid_token)
    # decode_token itself might not fail here, but the subsequent checks in dependencies will
    # this test primarily checks basic decoding.
    assert "scopes" in decode_token(invalid_token) # basic decode works
    
# --- FastAPI Dependency Tests ---

@pytest.mark.asyncio
async def test_get_current_user_from_token_success():
    mock_user_orm = ORMUser(id=1, email="active@example.com", hashed_password="hashed", is_active=True, role=ORMUser.UserRole.CUSTOMER)
    with patch('app.services.user_service.get_user_by_email', new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = UserRead.model_validate(mock_user_orm)
        
        token = create_access_token({"sub": "active@example.com", "token_type": "access"})
        user = await get_current_user_from_token(token)
        
        assert user.email == "active@example.com"
        mock_get_user.assert_called_once_with("active@example.com")

@pytest.mark.asyncio
async def test_get_current_user_from_token_invalid():
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_from_token("invalid.jwt.token")
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_current_user_from_token_user_not_found():
    with patch('app.services.user_service.get_user_by_email', new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = None
        token = create_access_token({"sub": "nonexistent@example.com", "token_type": "access"})
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_from_token(token)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_current_user_from_token_wrong_token_type():
    with patch('app.services.user_service.get_user_by_email', new_callable=AsyncMock) as mock_get_user:
        mock_get_user.return_value = UserRead(id=1, email="test@example.com", full_name="Test", is_active=True, role=UserRole.CUSTOMER)
        token = create_refresh_token({"sub": "test@example.com", "token_type": "refresh"}) # Refresh token used instead of access
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_from_token(token)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_current_active_user_success():
    mock_user = UserRead(id=1, email="active@example.com", full_name="Active User", is_active=True, role=UserRole.CUSTOMER)
    active_user = await get_current_active_user(mock_user)
    assert active_user == mock_user

@pytest.mark.asyncio
async def test_get_current_active_user_inactive():
    mock_user = UserRead(id=1, email="inactive@example.com", full_name="Inactive User", is_active=False, role=UserRole.CUSTOMER)
    with pytest.raises(HTTPException) as exc_info:
        await get_current_active_user(mock_user)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Inactive user" in exc_info.value.detail

@pytest.mark.asyncio
async def test_get_current_active_admin_success():
    mock_admin = UserRead(id=1, email="admin@example.com", full_name="Admin User", is_active=True, role=UserRole.ADMIN)
    active_admin = await get_current_active_admin(mock_admin)
    assert active_admin == mock_admin

@pytest.mark.asyncio
async def test_get_current_active_admin_not_admin():
    mock_customer = UserRead(id=1, email="customer@example.com", full_name="Customer User", is_active=True, role=UserRole.CUSTOMER)
    with pytest.raises(HTTPException) as exc_info:
        await get_current_active_admin(mock_customer)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert "administrative privileges" in exc_info.value.detail

```