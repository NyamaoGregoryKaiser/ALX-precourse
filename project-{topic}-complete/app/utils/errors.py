```python
# app/utils/errors.py
from werkzeug.exceptions import HTTPException

class APIError(HTTPException):
    """
    Base class for custom API errors.
    """
    code = 500
    description = "An unexpected error occurred."
    message = "Internal Server Error"

    def __init__(self, message=None, code=None, description=None, payload=None):
        super().__init__()
        if message is not None:
            self.message = message
        if code is not None:
            self.code = code
        if description is not None:
            self.description = description
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        rv['description'] = self.description
        rv['status_code'] = self.code
        return rv

class BadRequestError(APIError):
    code = 400
    message = "Bad Request"
    description = "The request was malformed or invalid."

class UnauthorizedError(APIError):
    code = 401
    message = "Unauthorized"
    description = "Authentication is required or has failed."

class ForbiddenError(APIError):
    code = 403
    message = "Forbidden"
    description = "You do not have permission to access this resource."

class NotFoundError(APIError):
    code = 404
    message = "Not Found"
    description = "The requested resource could not be found."

class ConflictError(APIError):
    code = 409
    message = "Conflict"
    description = "The request could not be completed due to a conflict with the current state of the resource."

class ValidationError(APIError):
    code = 422
    message = "Validation Error"
    description = "One or more validation errors occurred."
```