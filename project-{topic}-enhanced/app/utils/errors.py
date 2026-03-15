class APIError(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

class NotFoundError(APIError):
    def __init__(self, message="Resource not found", status_code=404, payload=None):
        super().__init__(message, status_code, payload)

class BadRequestError(APIError):
    def __init__(self, message="Bad request", status_code=400, payload=None):
        super().__init__(message, status_code, payload)

class UnauthorizedError(APIError):
    def __init__(self, message="Authentication required", status_code=401, payload=None):
        super().__init__(message, status_code, payload)

class ForbiddenError(APIError):
    def __init__(self, message="Permission denied", status_code=403, payload=None):
        super().__init__(message, status_code, payload)

class ConflictError(APIError):
    def __init__(self, message="Conflict occurred", status_code=409, payload=None):
        super().__init__(message, status_code, payload)

class ValidationError(APIError):
    def __init__(self, message="Validation failed", status_code=422, payload=None):
        super().__init__(message, status_code, payload)