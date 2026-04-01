```python
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_claims

def admin_required(fn):
    """
    Decorator to ensure the current user has admin privileges.
    Requires a valid JWT token to be present.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request() # Ensure JWT is present and valid
        claims = get_jwt_claims()
        if not claims.get('is_admin'):
            return jsonify(msg='Administrators only! Access forbidden.'), 403
        return fn(*args, **kwargs)
    return wrapper

def jwt_optional_with_user(fn):
    """
    Decorator to optionally load the JWT and user.
    If a token is present, it verifies it and attaches user info (if any).
    If no token is present, it proceeds without user info.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request(optional=True)
            # You might want to get the user here and pass it to the function
            # Or just let get_jwt_identity() be called later if needed by the function
        except Exception:
            # Log the error if needed, but continue as optional
            pass
        return fn(*args, **kwargs)
    return wrapper

```