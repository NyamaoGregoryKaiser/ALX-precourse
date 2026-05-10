import pytest
from datetime import timedelta, datetime, timezone
from jose import jwt
from app.auth import security
from app.core.config import settings

def test_create_access_token():
    user_id = 1
    token = security.create_access_token(user_id)
    assert isinstance(token, str)

    # Decode and verify
    decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
    assert decoded_token["sub"] == str(user_id)
    assert "exp" in decoded_token

def test_create_access_token_with_expires_delta():
    user_id = 2
    expires_delta = timedelta(minutes=5)
    token = security.create_access_token(user_id, expires_delta=expires_delta)

    decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
    assert decoded_token["sub"] == str(user_id)
    
    expected_exp = datetime.utcnow() + expires_delta
    # Allow for a small time difference during test execution
    assert (decoded_token["exp"] - expected_exp.timestamp()) < 2 # within 2 seconds

def test_verify_password():
    password = "mysecretpassword"
    hashed_password = security.get_password_hash(password)
    assert security.verify_password(password, hashed_password)

def test_verify_password_wrong_password():
    password = "mysecretpassword"
    hashed_password = security.get_password_hash(password)
    assert not security.verify_password("wrongpassword", hashed_password)

def test_get_password_hash():
    password = "mysecretpassword"
    hashed_password = security.get_password_hash(password)
    assert hashed_password != password # Should not be plain text
    assert len(hashed_password) > 20 # Should be a reasonably long hash
    assert hashed_password.startswith("$2b$") # Bcrypt hash prefix
```

#### `tests/unit/test_crud.py`
```python