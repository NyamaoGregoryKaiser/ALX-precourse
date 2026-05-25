import pytest
from app.models import User, TokenBlacklist
from app.extensions import db, bcrypt
from datetime import datetime, timedelta

def test_new_user(db_session):
    """Test user creation and password hashing."""
    user = User(username='testuser', email='test@example.com', password='password123')
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.username == 'testuser'
    assert user.email == 'test@example.com'
    assert user.is_active is True
    assert user.is_verified is False
    assert user.role == 'user'
    assert bcrypt.check_password_hash(user.password_hash, 'password123')

def test_set_password(db_session):
    """Test setting a new password."""
    user = User(username='another', email='another@example.com', password='oldpassword')
    db_session.add(user)
    db_session.commit()
    assert user.check_password('oldpassword')

    user.set_password('newpassword')
    db_session.commit()
    assert user.check_password('newpassword')
    assert not user.check_password('oldpassword')

def test_duplicate_username_email(db_session):
    """Test unique constraints on username and email."""
    user1 = User(username='duplicate', email='duplicate@example.com', password='password123')
    db_session.add(user1)
    db_session.commit()

    with pytest.raises(Exception): # Expecting an IntegrityError from DB
        user2 = User(username='duplicate', email='unique@example.com', password='password123')
        db_session.add(user2)
        db_session.commit()
    db_session.rollback() # Rollback the failed transaction

    with pytest.raises(Exception):
        user3 = User(username='unique', email='duplicate@example.com', password='password123')
        db_session.add(user3)
        db_session.commit()
    db_session.rollback()

def test_user_generate_tokens(db_session, app):
    """Test JWT token generation."""
    user = User(username='tokenuser', email='token@example.com', password='password123')
    db_session.add(user)
    db_session.commit()

    with app.app_context():
        tokens = user.generate_tokens()
        assert 'access_token' in tokens
        assert 'refresh_token' in tokens

        # Test additional claims
        access_token_data = app.extensions['jwt_manager'].decode_token(tokens['access_token'])
        assert access_token_data['sub'] == user.id
        assert 'roles' in access_token_data
        assert 'user' in access_token_data['roles']

def test_token_blacklist_model(db_session):
    """Test TokenBlacklist model creation."""
    user = User(username='blacklist_user', email='blacklist@example.com', password='password123')
    db_session.add(user)
    db_session.commit()

    expires_at = datetime.utcnow() + timedelta(hours=1)
    blacklisted_token = TokenBlacklist(
        jti='some_jwt_id_string',
        token_type='access',
        user_id=user.id,
        expires_at=expires_at
    )
    db_session.add(blacklisted_token)
    db_session.commit()

    assert blacklisted_token.id is not None
    assert blacklisted_token.jti == 'some_jwt_id_string'
    assert blacklisted_token.user_id == user.id
    assert blacklisted_token.user.username == user.username
    assert blacklisted_token.token_type == 'access'
    assert blacklisted_token.expires_at == expires_at
    assert blacklisted_token.revoked_at.date() == datetime.utcnow().date()