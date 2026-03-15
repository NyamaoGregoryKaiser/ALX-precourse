from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify
from app.utils.errors import ForbiddenError, UnauthorizedError
import logging

logger = logging.getLogger(__name__)

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt_identity()
                if claims.get('role') != 'admin':
                    raise ForbiddenError("Administrators only.")
            except UnauthorizedError as e:
                logger.warning(f"Unauthorized access attempt to admin resource: {e.message}")
                return jsonify({"message": e.message}), e.status_code
            except ForbiddenError as e:
                logger.warning(f"Forbidden access attempt to admin resource by user {claims.get('id')}: {e.message}")
                return jsonify({"message": e.message}), e.status_code
            except Exception as e:
                logger.error(f"JWT verification error for admin_required: {e}")
                return jsonify({"message": "Invalid token or authentication failed"}), 401
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def customer_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt_identity()
                if claims.get('role') not in ['customer', 'admin']: # Admins can also act as customers
                    raise ForbiddenError("Customers only.")
            except UnauthorizedError as e:
                logger.warning(f"Unauthorized access attempt to customer resource: {e.message}")
                return jsonify({"message": e.message}), e.status_code
            except ForbiddenError as e:
                logger.warning(f"Forbidden access attempt to customer resource by user {claims.get('id')}: {e.message}")
                return jsonify({"message": e.message}), e.status_code
            except Exception as e:
                logger.error(f"JWT verification error for customer_required: {e}")
                return jsonify({"message": "Invalid token or authentication failed"}), 401
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def requires_auth():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                logger.error(f"JWT verification error for requires_auth: {e}")
                return jsonify({"message": "Authentication required", "error": str(e)}), 401
            return fn(*args, **kwargs)
        return decorator
    return wrapper