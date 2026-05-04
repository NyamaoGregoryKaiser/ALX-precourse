```python
# app/utils/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.models.user_model import Role
from app.utils.errors import ForbiddenError
from app.utils.logger import logger

def role_required(role_name):
    """
    Decorator to restrict access to endpoints based on user roles.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role', 'User') # Default to 'User' if role not in claims

            required_role = Role.query.filter_by(name=role_name).first()
            if not required_role:
                logger.error(f"Required role '{role_name}' not found in DB.")
                raise ForbiddenError(message="Authorization Error", description="Required role configuration missing.")

            user_role_obj = Role.query.filter_by(name=user_role).first()

            if not user_role_obj or user_role_obj.id < required_role.id: # Assuming lower ID means higher privilege
                logger.warning(f"User with role '{user_role}' attempted to access '{fn.__name__}' which requires '{role_name}'.")
                raise ForbiddenError(message="Forbidden", description=f"You do not have the required '{role_name}' role.")

            return fn(*args, **kwargs)
        return decorator
    return wrapper

# Specific role decorators
admin_required = role_required('Admin')
```