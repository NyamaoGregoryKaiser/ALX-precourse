```python
import pytest
from datetime import datetime, timedelta, UTC
from jose import jwt, JWTError

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token, verify_token_type
from app.core.exceptions import HTTPException401, HTTPException403

def test_password_hashing():
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)
    assert hashed_password is not None
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 20 # bcrypt hashes are usually long

def test_password_verification():
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password) is True
    assert verify_password("wrongpassword", hashed_password) is False

def test_create_access_token():
    user_id = 1
    token = create_access_token({"user_id": user_id})
    assert token is not None
    assert isinstance(token, str)

    # Decode and verify payload
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["user_id"] == user_id
    assert payload["sub"] == "access"
    assert "exp" in payload
    # Ensure expiration is roughly correct
    exp_time = datetime.fromtimestamp(payload["exp"], tz=UTC)
    now = datetime.now(UTC)
    assert (exp_time - now).total_seconds() <= settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 + 5 # allow a small delta

def test_create_refresh_token():
    user_id = 1
    token = create_refresh_token({"user_id": user_id})
    assert token is not None
    assert isinstance(token, str)

    # Decode and verify payload
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["user_id"] == user_id
    assert payload["sub"] == "refresh"
    assert "exp" in payload
    # Ensure expiration is roughly correct
    exp_time = datetime.fromtimestamp(payload["exp"], tz=UTC)
    now = datetime.now(UTC)
    assert (exp_time - now).total_seconds() <= settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60 + 5 # allow a small delta

def test_decode_valid_token():
    user_id = 1
    token = create_access_token({"user_id": user_id})
    payload = decode_token(token)
    assert payload["user_id"] == user_id
    assert payload["sub"] == "access"

def test_decode_invalid_token():
    with pytest.raises(HTTPException401, match="Could not validate credentials"):
        decode_token("invalid.jwt.token")

def test_decode_expired_token():
    user_id = 1
    # Create an expired token
    expired_token = create_access_token({"user_id": user_id}, expires_delta=timedelta(minutes=-1))
    with pytest.raises(HTTPException401, match="Could not validate credentials"):
        decode_token(expired_token)

def test_verify_token_type_success():
    payload = {"user_id": 1, "sub": "access"}
    verify_token_type(payload, "access") # Should not raise an error

def test_verify_token_type_failure():
    payload = {"user_id": 1, "sub": "refresh"}
    with pytest.raises(HTTPException403, match="Invalid token type: expected access"):
        verify_token_type(payload, "access")

    payload = {"user_id": 1} # Missing 'sub'
    with pytest.raises(HTTPException403, match="Invalid token type: expected access"):
        verify_token_type(payload, "access")

```