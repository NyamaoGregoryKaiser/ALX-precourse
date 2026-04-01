```python
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_raw_jwt
from performance_monitor.models import User
from performance_monitor.extensions import db

# In a real application, revoked tokens would be stored in a persistent store (Redis, DB).
# For this example, we'll use a simple in-memory set.
# This would be cleared on app restart, so it's not truly production-ready without persistence.
REVOKED_TOKENS = set()

def authenticate_user(username, password):
    """
    Authenticates a user by username and password.
    Returns the user object if successful, None otherwise.
    """
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return user
    return None

def generate_tokens(user):
    """
    Generates access and refresh tokens for a given user.
    """
    access_token = create_access_token(identity=user.id, user_claims={'is_admin': user.is_admin}, fresh=True)
    refresh_token = create_refresh_token(identity=user.id)
    return access_token, refresh_token

@jwt_required
def get_current_user():
    """
    Retrieves the current authenticated user from the JWT identity.
    """
    user_id = get_jwt_identity()
    return User.query.get(user_id)

def add_token_to_blacklist(token_jti):
    """
    Adds a token's JTI to the blacklist.
    In a real app, this would be persisted.
    """
    REVOKED_TOKENS.add(token_jti)
    current_app.logger.info(f"Token JTI {token_jti} blacklisted.")

def is_token_blacklisted(decoded_token):
    """
    Checks if a token's JTI is in the blacklist.
    """
    jti = decoded_token['jti']
    return jti in REVOKED_TOKENS

# Register the callback function for checking if a token is revoked
def configure_jwt_revoked_store(jwt_manager):
    @jwt_manager.token_in_blacklist_loader
    def check_if_token_in_blacklist(decoded_token):
        return is_token_blacklisted(decoded_token)

```