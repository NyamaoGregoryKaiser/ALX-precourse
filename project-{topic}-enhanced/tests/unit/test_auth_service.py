```python
import pytest
from unittest.mock import AsyncMock
from app.services.auth import AuthService
from app.services.user import UserService
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import AuthException
from app.models.user import User, UserRole

@pytest.mark.asyncio
async def test_auth_service_authenticate_user_success(db_session):
    # Mock UserService
    mock_user_service = AsyncMock(spec=UserService)
    test_password = "testpassword"
    hashed_password = get_password_hash(test_password)
    mock_user = User(username="testuser", email="test@example.com", hashed_password=hashed_password, role=UserRole.MERCHANT)
    
    mock_user_service.get_user_by_username.return_value = mock_user

    auth_service = AuthService(db_session)
    auth_service.user_service = mock_user_service # Inject mock service

    user = await auth_service.authenticate_user("testuser", test_password)

    assert user.username == "testuser"
    mock_user_service.get_user_by_username.assert_called_once_with("testuser")
    assert verify_password(test_password, user.hashed_password)

@pytest.mark.asyncio
async def test_auth_service_authenticate_user_fail_username(db_session):
    mock_user_service = AsyncMock(spec=UserService)
    mock_user_service.get_user_by_username.return_value = None

    auth_service = AuthService(db_session)
    auth_service.user_service = mock_user_service

    with pytest.raises(AuthException, match="Incorrect username or password"):
        await auth_service.authenticate_user("nonexistent", "password")

    mock_user_service.get_user_by_username.assert_called_once_with("nonexistent")

@pytest.mark.asyncio
async def test_auth_service_authenticate_user_fail_password(db_session):
    mock_user_service = AsyncMock(spec=UserService)
    test_password = "testpassword"
    hashed_password = get_password_hash(test_password)
    mock_user = User(username="testuser", email="test@example.com", hashed_password=hashed_password, role=UserRole.MERCHANT)
    
    mock_user_service.get_user_by_username.return_value = mock_user

    auth_service = AuthService(db_session)
    auth_service.user_service = mock_user_service

    with pytest.raises(AuthException, match="Incorrect username or password"):
        await auth_service.authenticate_user("testuser", "wrongpassword")

    mock_user_service.get_user_by_username.assert_called_once_with("testuser")

@pytest.mark.asyncio
async def test_auth_service_create_access_token_integrity(db_session):
    token = create_access_token(data={"sub": "testuser"})
    assert isinstance(token, str)
    assert len(token) > 0 # Simple check for non-empty token
```