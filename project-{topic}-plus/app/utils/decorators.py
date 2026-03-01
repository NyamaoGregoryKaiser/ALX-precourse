```python
from functools import wraps
from flask import jsonify, abort
from flask_jwt_extended import get_jwt_identity, verify_jwt_arg_callbacks, current_user
from app.models import User, UserRole
import uuid

def role_required(role):
    """
    Decorator to restrict access to a route based on user role.
    Requires @jwt_required() to be applied first.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            if current_user.role != role:
                return jsonify(message=f"Access forbidden: {role.value} role required"), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def admin_required(fn):
    """Decorator for admin-only access."""
    return role_required(UserRole.ADMIN)(fn)

def customer_required(fn):
    """Decorator for customer-only access."""
    return role_required(UserRole.CUSTOMER)(fn)

def admin_or_owner_required(resource_id_param_name):
    """
    Decorator to allow access if user is an admin OR the owner of the resource.
    The resource_id_param_name should match the name of the URL parameter
    that contains the resource's UUID.
    Requires @jwt_required() to be applied first.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            resource_id = kwargs.get(resource_id_param_name)
            if not resource_id:
                # This should ideally be caught by Flask's routing, but as a safeguard.
                return jsonify(message=f"Resource ID parameter '{resource_id_param_name}' missing."), 500

            # Convert resource_id to string for comparison, as UUIDField converts it to uuid.UUID
            if isinstance(resource_id, uuid.UUID):
                resource_id = str(resource_id)

            # Check if current user is admin
            if current_user.role == UserRole.ADMIN:
                return fn(*args, **kwargs)

            # Check if current user is the owner of the resource
            if str(current_user.id) == resource_id:
                return fn(*args, **kwargs)
            
            return jsonify(message="Access forbidden: Admin or resource owner privilege required"), 403
        return decorator
    return wrapper
```