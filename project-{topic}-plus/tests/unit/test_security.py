from datetime import timedelta
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings

def test_get_password_hash():
    password = "testpassword"
    hashed_password = get_password_hash(password)
    assert isinstance(hashed_password, str)
    assert hashed_password != password
    assert len(hashed_password) > 20 # bcrypt hashes are quite long

def test_verify_password():
    password = "testpassword"
    hashed_password = get_password_hash(password)
    assert verify_password(password, hashed_password)
    assert not verify_password("wrongpassword", hashed_password)

def test_create_access_token():
    data = {"sub": "test@example.com"}
    token = create_access_token(data)
    assert isinstance(token, str)

    # Test with custom expiry
    expires_delta = timedelta(minutes=5)
    token_with_expiry = create_access_token(data, expires_delta=expires_delta)
    assert isinstance(token_with_expiry, str)

    # Decode to verify payload (basic check, full validation is in FastAPI deps)
    import jwt
    decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
    assert decoded_token["sub"] == "test@example.com"
    assert "exp" in decoded_token