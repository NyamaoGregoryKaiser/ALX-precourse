```python
import pytest
from datetime import timedelta, datetime, UTC
from jose import jwt

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.exceptions import UnauthorizedException

def test_password_hashing():
    """Test password hashing and verification."""
    password = "securepassword123"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert len(hashed_password) > 50 # bcrypt hashes are long

    # Verify correct password
    assert verify_password(password, hashed_password)

    # Verify incorrect password
    assert not verify_password("wrongpassword", hashed_password)
    assert not verify_password("securepassword124", hashed_password)

def test_create_access_token():
    """Test access token creation."""
    data = {"sub": "user_id_123", "role": "user"}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 0

    # Test with custom expiration
    custom_expires_delta = timedelta(minutes=5)
    token_custom_exp = create_access_token(data, expires_delta=custom_expires_delta)
    decoded_custom_exp = jwt.decode(token_custom_exp, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    # Check if expiration is roughly around 5 minutes from now
    expected_exp = datetime.now(UTC) + custom_expires_delta
    assert decoded_custom_exp["exp"] - expected_exp.timestamp() < 5 # Allow for slight time differences

def test_decode_access_token_valid():
    """Test decoding a valid access token."""
    data = {"sub": "user_id_123", "role": "user"}
    token = create_access_token(data, expires_delta=timedelta(minutes=1)) # Short-lived token
    decoded_payload = decode_access_token(token)

    assert "sub" in decoded_payload
    assert decoded_payload["sub"] == "user_id_123"
    assert decoded_payload["role"] == "user"
    assert "exp" in decoded_payload
    assert "iat" in decoded_payload

def test_decode_access_token_expired():
    """Test decoding an expired access token."""
    data = {"sub": "user_id_123"}
    # Create a token that expires immediately
    expired_token = create_access_token(data, expires_delta=timedelta(microseconds=1))
    
    # Wait a very short moment to ensure expiration
    import time
    time.sleep(0.01)

    with pytest.raises(UnauthorizedException) as exc_info:
        decode_access_token(expired_token)
    assert "Token has expired" in str(exc_info.value.message)

def test_decode_access_token_invalid_signature():
    """Test decoding a token with an invalid signature."""
    data = {"sub": "user_id_123", "exp": (datetime.now(UTC) + timedelta(minutes=10)).timestamp()}
    # Encode with a wrong secret key
    wrong_secret = "wrong-secret"
    invalid_token = jwt.encode(data, wrong_secret, algorithm=settings.ALGORITHM)

    with pytest.raises(UnauthorizedException) as exc_info:
        decode_access_token(invalid_token)
    assert "Could not validate credentials" in str(exc_info.value.message)

def test_decode_access_token_malformed():
    """Test decoding a malformed token."""
    malformed_token = "this.is.not.a.jwt"
    with pytest.raises(UnauthorizedException) as exc_info:
        decode_access_token(malformed_token)
    assert "Could not validate credentials" in str(exc_info.value.message)

    malformed_token_2 = "header.payload" # Missing signature
    with pytest.raises(UnauthorizedException) as exc_info:
        decode_access_token(malformed_token_2)
    assert "Token decoding failed" in str(exc_info.value.message)

def test_decode_access_token_missing_payload_key():
    """Test decoding a token missing required payload keys (e.g., 'sub')."""
    # Our `decode_access_token` doesn't explicitly check for 'sub' in the payload
    # It just returns the payload. If the consumer of `decode_access_token` expects 'sub',
    # that check would happen later.
    data = {"role": "user", "exp": (datetime.now(UTC) + timedelta(minutes=10)).timestamp()}
    token_missing_sub = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    decoded_payload = decode_access_token(token_missing_sub)
    assert "sub" not in decoded_payload # It should just return what's there

```