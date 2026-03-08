```python
import pytest
from datetime import datetime, timedelta, timezone
from jose import JWTError
from app.core import security
from app.core.config import get_settings

# Get settings configured for testing (from conftest.py override)
settings = get_settings()

def test_verify_password():
    password = "testpassword"
    hashed_password = security.get_password_hash(password)
    assert security.verify_password(password, hashed_password)
    assert not security.verify_password("wrongpassword", hashed_password)

def test_get_password_hash():
    password = "testpassword"
    hashed_password = security.get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 0
    assert hashed_password.startswith("$2b$") # Bcrypt hash starts with this

def test_create_access_token():
    data = {"sub": "testuser", "id": 1}
    token = security.create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 0

    decoded_data = security.decode_access_token(token)
    assert decoded_data["sub"] == data["sub"]
    assert decoded_data["id"] == data["id"]
    assert "exp" in decoded_data

def test_create_access_token_with_expiry():
    data = {"sub": "testuser", "id": 1}
    expires_delta = timedelta(minutes=1)
    token = security.create_access_token(data, expires_delta=expires_delta)
    decoded_data = security.decode_access_token(token)

    # Check expiration is close to expected
    expected_exp = datetime.now(timezone.utc) + expires_delta
    # Allow for a small delta due to execution time differences
    assert abs((datetime.fromtimestamp(decoded_data["exp"], timezone.utc) - expected_exp).total_seconds()) < 5

def test_decode_access_token_expired():
    data = {"sub": "testuser", "id": 1}
    # Create a token that expires instantly (or in the past)
    expired_token = security.create_access_token(data, expires_delta=timedelta(seconds=-1))
    with pytest.raises(JWTError):
        security.decode_access_token(expired_token)

def test_decode_access_token_invalid_signature():
    data = {"sub": "testuser", "id": 1}
    token = security.create_access_token(data)
    # Tamper with the token by changing the secret key during decoding
    original_secret_key = settings.SECRET_KEY
    settings.SECRET_KEY = "wrong-secret-key"
    try:
        with pytest.raises(JWTError):
            security.decode_access_token(token)
    finally:
        settings.SECRET_KEY = original_secret_key # Restore original settings

def test_decode_access_token_malformed():
    malformed_token = "invalid.token.string"
    with pytest.raises(JWTError):
        security.decode_access_token(malformed_token)

    malformed_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.S_INVALID_SIGNATURE_PART"
    with pytest.raises(JWTError):
        security.decode_access_token(malformed_token)
```