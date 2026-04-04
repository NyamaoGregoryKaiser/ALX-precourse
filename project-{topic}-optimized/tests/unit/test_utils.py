import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi import HTTPException, status

from app.core.config import settings
from app.utils.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    decode_token
)
from app.db.models import User, UserRole # For type hinting in dependencies
from app.exceptions import CredentialException # Custom exception

def test_get_password_hash_and_verify_password():
    """
    Test that passwords can be hashed and then successfully verified.
    """
    password = "secure_password"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert hashed_password != password # Hashed password should not be plain text
    assert verify_password(password, hashed_password)
    assert not verify_password("wrong_password", hashed_password)

def test_create_access_token():
    """
    Test creation of an access token with custom expiry.
    """
    user_data = {"sub": "1", "email": "test@example.com", "role": UserRole.USER}
    expires_delta = timedelta(minutes=5)
    token = create_access_token(user_data, expires_delta=expires_delta)
    assert isinstance(token, str)

    # Decode and verify payload
    payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "1"
    assert payload["email"] == "test@example.com"
    assert payload["role"] == UserRole.USER
    assert payload["type"] == "access"
    
    # Check expiry is roughly correct (allow for small discrepancies due to execution time)
    expected_exp = datetime.now(timezone.utc) + expires_delta
    actual_exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    assert abs((expected_exp - actual_exp).total_seconds()) < 2 # Should be within 2 seconds

def test_create_refresh_token():
    """
    Test creation of a refresh token with default expiry.
    """
    user_data = {"sub": "1"}
    token = create_refresh_token(user_data)
    assert isinstance(token, str)

    # Decode and verify payload
    payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "1"
    assert "email" not in payload # Refresh tokens typically have minimal claims
    assert payload["type"] == "refresh"
    
    # Check expiry is roughly correct (default from settings)
    expected_exp = datetime.now(timezone.utc) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    actual_exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    assert abs((expected_exp - actual_exp).total_seconds()) < 2 # Should be within 2 seconds

def test_decode_token_valid():
    """
    Test successful decoding of a valid token.
    """
    user_data = {"sub": "1", "email": "test@example.com", "role": UserRole.USER}
    token = create_access_token(user_data, expires_delta=timedelta(minutes=1))
    decoded_payload = decode_token(token)
    assert decoded_payload["sub"] == "1"
    assert decoded_payload["email"] == "test@example.com"
    assert decoded_payload["role"] == UserRole.USER
    assert decoded_payload["type"] == "access"

def test_decode_token_invalid_signature():
    """
    Test decoding a token with an invalid signature.
    """
    user_data = {"sub": "1"}
    token = jwt.encode(user_data, "wrong_secret_key", algorithm=settings.ALGORITHM)
    with pytest.raises(CredentialException) as exc_info:
        decode_token(token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail

def test_decode_token_expired():
    """
    Test decoding an expired token.
    """
    user_data = {"sub": "1"}
    # Create an already expired token
    expired_token = create_access_token(user_data, expires_delta=timedelta(seconds=-1))
    
    # Manually delay a bit to ensure it's "expired" by the time of decode
    import time
    time.sleep(1) 

    with pytest.raises(CredentialException) as exc_info:
        decode_token(expired_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail

def test_decode_token_malformed():
    """
    Test decoding a malformed token.
    """
    malformed_token = "not.a.jwt.token"
    with pytest.raises(CredentialException) as exc_info:
        decode_token(malformed_token)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail

# Note: get_current_user, get_current_active_user, get_current_admin_user
# are FastAPI dependencies. Testing them directly requires mocking FastAPI's
# `Depends` and database session, which is typically done in integration tests
# using `TestClient` or `httpx.AsyncClient` with dependency overrides.
```