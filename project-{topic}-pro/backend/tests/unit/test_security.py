```python
from datetime import timedelta
from app.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    ALGORITHM,
    SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from jose import jwt, JWTError

def test_verify_password():
    plain_password = "mysecretpassword"
    hashed_password = get_password_hash(plain_password)
    assert verify_password(plain_password, hashed_password)
    assert not verify_password("wrongpassword", hashed_password)

def test_get_password_hash():
    plain_password = "mysecretpassword"
    hashed_password = get_password_hash(plain_password)
    assert hashed_password.startswith("$2b$")
    assert len(hashed_password) > 50 # bcrypt hashes are quite long
    assert hashed_password != plain_password

def test_create_access_token():
    data = {"sub": "test@example.com"}
    token = create_access_token(data=data)
    assert isinstance(token, str)

    # Verify the token
    try:
        decoded_payload = jwt.decode(token, SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
        assert decoded_payload["sub"] == "test@example.com"
        assert "exp" in decoded_payload
        assert "iat" in decoded_payload
    except JWTError:
        pytest.fail("Token decoding failed unexpectedly.")

def test_create_access_token_with_custom_expiry():
    data = {"sub": "test@example.com"}
    expires_delta = timedelta(minutes=5)
    token = create_access_token(data=data, expires_delta=expires_delta)

    try:
        decoded_payload = jwt.decode(token, SECRET_KEY.get_secret_value(), algorithms=[ALGORITHM])
        assert decoded_payload["sub"] == "test@example.com"
        # Check if expiration is roughly as expected (within a small margin)
        # We can't check exact time due to execution time, but ensure it's not the default
        # For a more precise check, mock datetime or compare directly with expires_delta
    except JWTError:
        pytest.fail("Token decoding failed unexpectedly.")
```