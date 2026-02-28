from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from flask import abort, current_app
from .errors import ForbiddenError, UnauthorizedError

def role_required(roles=None):
    """
    Decorator to restrict access to endpoints based on user roles.
    Accepts a single role string or a list of role strings.
    If no roles are specified, it only checks if the user is authenticated.
    """
    if roles is None:
        roles = []
    if isinstance(roles, str):
        roles = [roles]

    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                user_roles = claims.get('roles', [])

                if not roles: # No specific roles required, just needs to be authenticated
                    return fn(*args, **kwargs)

                # Check if user has any of the required roles
                if not any(role in user_roles for role in roles):
                    current_app.logger.warning(
                        f"Forbidden access attempt by user {claims.get('sub')} "
                        f"with roles {user_roles} to resource requiring roles {roles}"
                    )
                    raise ForbiddenError("You do not have the necessary permissions to access this resource.")
            except Exception as e:
                current_app.logger.exception(f"Authentication/Authorization error: {e}")
                if isinstance(e, ForbiddenError):
                    raise e # Re-raise custom ForbiddenError
                raise UnauthorizedError("Authentication required or token is invalid/expired.")

            return fn(*args, **kwargs)
        return decorator
    return wrapper

def cache_response(timeout=60, key_prefix="view"):
    """
    Decorator to cache the response of a view function.
    The cache key is generated from the request path and query parameters.
    """
    from app.extensions import cache
    from flask import request

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = f"{key_prefix}:{request.path}{request.query_string.decode('utf-8')}"
            response = cache.get(cache_key)
            if response is None:
                current_app.logger.debug(f"Cache miss for key: {cache_key}")
                response = f(*args, **kwargs)
                # Assuming the response is a Flask Response object or a tuple (data, status)
                # We need to ensure we cache the actual response content and status
                if isinstance(response, tuple):
                    cache.set(cache_key, response, timeout=timeout)
                else: # Assuming it's a Response object
                    cache.set(cache_key, (response.get_json(), response.status_code, response.headers), timeout=timeout)
            else:
                current_app.logger.debug(f"Cache hit for key: {cache_key}")
                # Reconstruct response from cached data
                if isinstance(response, tuple) and len(response) == 3: # (data, status_code, headers)
                    from flask import make_response
                    cached_data, cached_status, cached_headers = response
                    resp = make_response(cached_data, cached_status)
                    resp.headers = cached_headers
                    return resp
                else: # (data, status_code)
                    from flask import jsonify
                    return jsonify(response[0]), response[1] # For simple jsonify responses

            return response
        return decorated_function
    return decorator