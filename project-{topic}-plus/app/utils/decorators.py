from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models import User, Role
from app.utils.exceptions import ForbiddenError, NotFoundError
from app import limiter, cache
import logging

logger = logging.getLogger(__name__)

def jwt_and_roles_required(roles=None, fresh=False):
    """
    A decorator that ensures a valid JWT is present and the user has one of the specified roles.
    Args:
        roles (list[Role], optional): A list of Role enums that are allowed to access the endpoint.
                                      If None, any authenticated user can access.
        fresh (bool): If True, requires a fresh access token.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request(fresh=fresh)
            current_user_id = get_jwt_identity()

            user = User.query.get(current_user_id)
            if not user:
                logger.error(f"Authenticated user ID {current_user_id} not found in DB.")
                raise NotFoundError("Authenticated user not found.")

            if roles:
                if user.role not in roles:
                    logger.warning(f"User {user.username} (ID: {current_user_id}, Role: {user.role.value}) attempted to access forbidden resource. Required roles: {[r.value for r in roles]}")
                    raise ForbiddenError("You do not have the necessary permissions to access this resource.")
            
            # Pass user object or role/id to the decorated function if needed
            # For simplicity, we'll pass current_user_id and current_user_role
            kwargs['current_user_id'] = current_user_id
            kwargs['current_user_role'] = user.role
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(fn):
    """Decorator to require an admin role."""
    return jwt_and_roles_required(roles=[Role.ADMIN])(fn)

def user_and_admin_required(fn):
    """Decorator to require either a regular user or admin role."""
    return jwt_and_roles_required(roles=[Role.USER, Role.ADMIN])(fn)

def rate_limit(limit_string):
    """
    Decorator for rate limiting an endpoint.
    Args:
        limit_string (str): A string representing the rate limit, e.g., "10 per minute".
    """
    def decorator(fn):
        @wraps(fn)
        @limiter.limit(limit_string)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def cache_response(timeout=None, key_prefix='view'):
    """
    Decorator to cache the response of an endpoint.
    Args:
        timeout (int, optional): Cache timeout in seconds. Uses CACHE_DEFAULT_TIMEOUT if None.
        key_prefix (str): Prefix for the cache key.
    """
    def decorator(fn):
        @wraps(fn)
        @cache.cached(timeout=timeout, key_prefix=key_prefix)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def jwt_refresh_token_required(fn):
    """
    Decorator to protect a view with a refresh token.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request(refresh=True)
        # Store JTI for potential revocation later
        kwargs['jti'] = get_jwt()['jti']
        return fn(*args, **kwargs)
    return wrapper

def jwt_access_token_required(fn):
    """
    Decorator to protect a view with an access token (not necessarily fresh).
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        # Store JTI for potential revocation later
        kwargs['jti'] = get_jwt()['jti']
        return fn(*args, **kwargs)
    return wrapper
```