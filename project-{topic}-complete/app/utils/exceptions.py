```python
class CustomError(Exception):
    """Base class for custom exceptions in the application."""
    status_code = 500
    message = "An unexpected error occurred."

    def __init__(self, message=None, status_code=None, payload=None):
        super().__init__(message)
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

class ResourceNotFound(CustomError):
    """Exception for when a requested resource is not found (404)."""
    status_code = 404
    message = "Resource not found."

class InvalidInput(CustomError):
    """Exception for invalid or missing input data (400)."""
    status_code = 400
    message = "Invalid input provided."

class DuplicateResource(CustomError):
    """Exception for attempting to create a resource that already exists (409)."""
    status_code = 409
    message = "Resource already exists."

class UnauthorizedAccess(CustomError):
    """Exception for when a user is forbidden from accessing a resource (403)."""
    status_code = 403
    message = "You do not have permission to perform this action."

class AuthenticationError(CustomError):
    """Exception for authentication failures (e.g., wrong password, inactive user) (401)."""
    status_code = 401
    message = "Authentication failed."

```