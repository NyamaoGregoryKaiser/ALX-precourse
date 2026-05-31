from functools import wraps
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.errors import ForbiddenError, UnauthorizedError
from app.models import User
import logging

log = logging.getLogger(__name__)

def admin_required():
    """
    A decorator to protect a Flask-RESTX endpoint with JWT and ensure the user is an admin.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('is_admin'):
                return fn(*args, **kwargs)
            else:
                log.warning(f"Forbidden access attempt by user {get_jwt_identity()} (not admin).")
                raise ForbiddenError("Admins only!")
        return decorator
    return wrapper

def jwt_required_with_identity():
    """
    A decorator to protect a Flask-RESTX endpoint with JWT,
    and inject the current_user object into the function if found.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            current_user = User.query.get(user_id)
            if current_user is None:
                log.error(f"JWT identity {user_id} not found in database.")
                raise UnauthorizedError("User associated with token not found.")
            # Pass the current_user to the decorated function
            return fn(current_user, *args, **kwargs)
        return decorator
    return wrapper

def owns_resource_or_admin(model_class, id_param_name='id'):
    """
    A decorator to ensure the current_user owns the resource or is an admin.
    Requires `jwt_required_with_identity` to run first to provide `current_user`.
    The decorated function must accept `current_user` as its first argument
    and the resource ID as a keyword argument named by `id_param_name`.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(current_user, *args, **kwargs):
            resource_id = kwargs.get(id_param_name)
            if not resource_id:
                log.error(f"Missing resource ID parameter '{id_param_name}' in decorated function.")
                raise InternalServerError(f"Configuration error: Missing ID parameter for resource ownership check.")

            resource = model_class.query.get(resource_id)
            if not resource:
                raise ForbiddenError("Resource not found or you do not have access.") # Obscure 'not found' vs 'no access' for security

            # Check if user owns the resource
            if hasattr(resource, 'user_id') and resource.user_id == current_user.id:
                return fn(current_user, *args, **kwargs)

            # Check if user is admin
            claims = get_jwt()
            if claims.get('is_admin'):
                return fn(current_user, *args, **kwargs)

            log.warning(f"Forbidden access attempt to {model_class.__name__} {resource_id} by user {current_user.id}.")
            raise ForbiddenError("You do not have permission to access this resource.")
        return decorator
    return wrapper