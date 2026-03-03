import jwt
from functools import wraps
from flask import request, current_app, g
from app.models.user import User
from app.utils.errors import UnauthorizedError, ForbiddenError

def get_current_user_id():
    """Extracts user ID from the JWT token in the request header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise UnauthorizedError("Authorization token is missing.")

    try:
        token_type, token = auth_header.split(None, 1)
    except ValueError:
        raise UnauthorizedError("Invalid Authorization header format.")

    if token_type.lower() != 'bearer':
        raise UnauthorizedError("Authorization token must be a Bearer token.")

    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token has expired.")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid token.")

def token_required(f):
    """Decorator to protect API routes requiring authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_current_user_id()
        user = User.get_by_id(user_id)
        if not user:
            raise UnauthorizedError("User not found.")
        g.current_user = user # Store user object in Flask's global context
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to protect API routes requiring admin privileges."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'current_user') or not g.current_user.is_admin:
            raise ForbiddenError("Admin access required.")
        return f(*args, **kwargs)
    return decorated
```