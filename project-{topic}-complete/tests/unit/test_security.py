```python
from datetime import timedelta

import pytest

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password


def test_get_password_hash():
    """Test password hashing function."""
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert hashed_password != password
    assert len(hashed_password) > 10 # bcrypt hashes are usually long enough


def test_verify_password():
    """Test password verification function."""
    password = "mysecretpassword"
    hashed_password = get_password_hash(password)

    assert verify_password(password, hashed_password)
    assert not verify_password("wrongpassword", hashed_password)
    assert not verify_password(password, "wronghash")


def test_create_access_token():
    """Test JWT access token creation."""
    user_id = "test_user_id"
    token = create_access_token(user_id)
    assert isinstance(token, str)

    # Test with custom expiry
    expires_delta = timedelta(minutes=5)
    token_with_expiry = create_access_token(user_id, expires_delta=expires_delta)
    assert isinstance(token_with_expiry, str)

    # Decode and verify (requires actual JOSE decode, but we can verify structure)
    # This is more an integration test for FastAPI + JWT, but here we just check format
    from jose import jwt
    decoded_payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded_payload["sub"] == user_id
    assert "exp" in decoded_payload
```