from slugify import slugify as pyslugify
import secrets
import string
from functools import wraps
from flask import request, abort, current_app, jsonify
from app.extensions import cache, limiter
from app.extensions import jwt, admin_permission, editor_permission, author_permission
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

def slugify_content_title(title):
    """Generates a URL-friendly slug from a title."""
    return pyslugify(title)

def generate_random_string(length=16):
    """Generates a random alphanumeric string."""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for i in range(length))

def get_current_user_id():
    """Extracts the user ID from the JWT token."""
    try:
        verify_jwt_in_request()
        return get_jwt_identity()
    except Exception:
        return None

def has_roles(roles):
    """Decorator to check if the current user has any of the specified roles."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                user_role = claims.get('role')
                if not user_role or user_role not in roles:
                    current_app.logger.warning(f"Unauthorized access attempt by user {get_jwt_identity()} (role: {user_role}). Requires one of: {', '.join(roles)}")
                    abort(403, description="Insufficient permissions.")
                return f(*args, **kwargs)
            except Exception as e:
                current_app.logger.error(f"Authentication error in has_roles: {e}")
                abort(401, description="Authentication required.")
        return wrapper
    return decorator

# Simplified permission check for Flask-Principal (can be used in views)
def check_permission(permission):
    """
    Checks if the current identity has the given permission.
    Aborts with 403 if not.
    """
    if not permission.can():
        abort(403, description="You do not have the necessary permissions for this action.")

# --- Caching Decorator ---
def cached(timeout=5 * 60, key_prefix='view_%s'):
    """
    Decorator for caching view function responses.
    Cache key is generated from request path and query string.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = request.path + request.query_string.decode('utf-8')
            response = cache.get(cache_key)
            if response is None:
                response = f(*args, **kwargs)
                cache.set(cache_key, response, timeout=timeout)
            return response
        return decorated_function
    return decorator

# --- Rate Limiting Decorator ---
def rate_limit(limit_string):
    """
    Decorator for applying rate limits to specific API endpoints.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Limiter object is globally configured, so just apply it.
            # The error handler for 429 will be triggered automatically.
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```