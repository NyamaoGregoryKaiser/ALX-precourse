```python
from http import HTTPStatus

class APIError(Exception):
    """
    Base class for custom API errors.
    """
    def __init__(self, message, status_code=HTTPStatus.INTERNAL_SERVER_ERROR):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def to_dict(self):
        return {'message': self.message, 'status_code': self.status_code}

class BadRequestError(APIError):
    """Raised when the request is malformed or invalid."""
    def __init__(self, message="Bad request"):
        super().__init__(message, HTTPStatus.BAD_REQUEST)

class UnauthorizedError(APIError):
    """Raised when authentication fails or is required."""
    def __init__(self, message="Authentication required"):
        super().__init__(message, HTTPStatus.UNAUTHORIZED)

class ForbiddenError(APIError):
    """Raised when a user is authenticated but lacks necessary permissions."""
    def __init__(self, message="Permission denied"):
        super().__init__(message, HTTPStatus.FORBIDDEN)

class NotFoundError(APIError):
    """Raised when a requested resource does not exist."""
    def __init__(self, message="Resource not found"):
        super().__init__(message, HTTPStatus.NOT_FOUND)

class ConflictError(APIError):
    """Raised when a request conflicts with the current state of the server."""
    def __init__(self, message="Resource conflict"):
        super().__init__(message, HTTPStatus.CONFLICT)

class ServerError(APIError):
    """Raised for unexpected server-side errors."""
    def __init__(self, message="An unexpected server error occurred"):
        super().__init__(message, HTTPStatus.INTERNAL_SERVER_ERROR)

# --- JWT Specific Errors ---
class InvalidTokenError(UnauthorizedError):
    """Raised when a JWT token is invalid or malformed."""
    def __init__(self, message="Invalid token"):
        super().__init__(message)

class TokenExpiredError(UnauthorizedError):
    """Raised when a JWT token has expired."""
    def __init__(self, message="Token has expired"):
        super().__init__(message)

class RevokedTokenError(UnauthorizedError):
    """Raised when a JWT token has been revoked."""
    def __init__(self, message="Token has been revoked"):
        super().__init__(message)
```