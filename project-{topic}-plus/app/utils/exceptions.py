class CustomError(Exception):
    """Base class for custom application exceptions."""
    def __init__(self, message, status_code=500, code="INTERNAL_SERVER_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code

    def to_dict(self):
        return {
            "code": self.code,
            "message": self.message,
            "status_code": self.status_code
        }

class UnauthorizedError(CustomError):
    """Exception for authentication failures (401 Unauthorized)."""
    def __init__(self, message="Authentication required or failed."):
        super().__init__(message, status_code=401, code="UNAUTHORIZED")

class ForbiddenError(CustomError):
    """Exception for authorization failures (403 Forbidden)."""
    def __init__(self, message="You do not have permission to access this resource."):
        super().__init__(message, status_code=403, code="FORBIDDEN")

class NotFoundError(CustomError):
    """Exception for resources not found (404 Not Found)."""
    def __init__(self, message="Resource not found."):
        super().__init__(message, status_code=404, code="NOT_FOUND")

class BadRequestError(CustomError):
    """Exception for invalid client requests (400 Bad Request)."""
    def __init__(self, message="Invalid request parameters."):
        super().__init__(message, status_code=400, code="BAD_REQUEST")

class ConflictError(CustomError):
    """Exception for resource conflicts (409 Conflict)."""
    def __init__(self, message="Resource conflict."):
        super().__init__(message, status_code=409, code="CONFLICT")
```