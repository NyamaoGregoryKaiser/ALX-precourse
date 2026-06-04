```python
from functools import wraps
from flask import jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

def admin_required():
    """
    Decorator to restrict access to 'admin' role only.
    Requires a valid JWT token.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') != 'admin':
                return jsonify({"message": "Administrators only!"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def role_required(roles):
    """
    Decorator to restrict access based on a list of roles.
    Requires a valid JWT token.

    Args:
        roles (list): A list of allowed roles (e.g., ['admin', 'editor']).
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role')
            if user_role not in roles:
                current_app.logger.warning(f"Unauthorized access attempt by user (ID: {get_jwt_identity()}) with role '{user_role}' to a role-restricted endpoint. Required roles: {roles}")
                return jsonify({"message": f"Access forbidden. Required roles: {', '.join(roles)}."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def fresh_jwt_required_custom():
    """
    Decorator for endpoints that require a "fresh" JWT.
    Customized to provide a specific error message.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request(fresh=True)
                return fn(*args, **kwargs)
            except Exception as e:
                current_app.logger.warning(f"Fresh JWT required failed: {e}")
                return jsonify({"message": "Fresh token required for this action. Please log in again with your password."}), 401
        return decorator
    return wrapper
```