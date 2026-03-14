```python
from flask import current_app, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from functools import wraps
from app.models.user import User
from app.utils.exceptions import UnauthorizedAccess

class CustomJWTError(Exception):
    pass

def jwt_optional_and_current_user():
    """Decorator to load user if JWT is present, but not enforce it."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                if user_id:
                    current_app.current_user = User.query.get(user_id)
                else:
                    current_app.current_user = None
            except Exception:
                current_app.current_user = None
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def get_current_user_role():
    """Helper to get current user's role from JWT claims."""
    try:
        claims = get_jwt()
        return claims.get('role')
    except RuntimeError: # If not in a request context with JWT
        return None

def is_admin():
    """Checks if the current user has the 'admin' role."""
    return get_current_user_role() == 'admin'

def is_manager():
    """Checks if the current user has the 'manager' role."""
    return get_current_user_role() == 'manager'

def is_admin_or_manager():
    """Checks if the current user has 'admin' or 'manager' role."""
    role = get_current_user_role()
    return role in ['admin', 'manager']
```