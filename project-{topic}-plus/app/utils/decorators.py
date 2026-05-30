```python
from functools import wraps
from flask import g, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models.user import User, UserRole
from app.utils.errors import UnauthorizedError, ForbiddenError
import logging

def jwt_required_wrapper(fn):
    """
    A wrapper around Flask-JWT-Extended's jwt_required decorator.
    It attempts to load the current user into Flask's `g` object.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_app.logger.debug(f"Executing jwt_required_wrapper for {fn.__name__}")
        verify_jwt_in_request() # Verifies JWT and handles common errors (expired, invalid, etc.)
        
        # At this point, the token is valid. Now load the user.
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user is None:
            current_app.logger.warning(f"JWT provided for non-existent user ID: {user_id}")
            raise UnauthorizedError("User associated with token not found.")
        
        if not user.is_active:
            current_app.logger.warning(f"JWT provided for inactive user ID: {user_id}")
            raise ForbiddenError("User account is inactive.")

        g.current_user = user # Attach user object to global Flask context
        current_app.logger.debug(f"User {user.username} (ID: {user.id}) attached to g.current_user.")
        return fn(*args, **kwargs)
    return wrapper

def roles_required(roles):
    """
    A decorator to restrict access to endpoints based on user roles.
    Requires @jwt_required_wrapper to be applied first or user to be loaded manually.

    Args:
        roles (list or UserRole): A single UserRole enum or a list of UserRole enums required to access the endpoint.
    """
    if not isinstance(roles, (list, tuple)):
        roles = [roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_app.logger.debug(f"Executing roles_required decorator for {fn.__name__} with roles: {[r.value for r in roles]}")
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                current_app.logger.error("roles_required used without jwt_required_wrapper, g.current_user not set.")
                raise UnauthorizedError("Authentication required and user context not loaded.")

            user = g.current_user
            
            # Check if the user has any of the required roles
            has_permission = any(user.has_role(role) for role in roles)
            
            if not has_permission:
                current_app.logger.warning(f"User {user.username} (ID: {user.id}, Role: {user.role.value}) denied access to {fn.__name__}. Required roles: {[r.value for r in roles]}")
                raise ForbiddenError(f"Access denied. Required roles: {', '.join([r.value for r in roles])}")
            
            current_app.logger.debug(f"User {user.username} (ID: {user.id}, Role: {user.role.value}) granted access to {fn.__name__}.")
            return fn(*args, **kwargs)
        return wrapper
    return decorator

```