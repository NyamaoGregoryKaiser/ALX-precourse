from flask import jsonify

class APIError(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

def handle_api_error(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

class NotFoundError(APIError):
    status_code = 404
    def __init__(self, message="Resource not found", payload=None):
        super().__init__(message, status_code=404, payload=payload)

class UnauthorizedError(APIError):
    status_code = 401
    def __init__(self, message="Authentication required", payload=None):
        super().__init__(message, status_code=401, payload=payload)

class ForbiddenError(APIError):
    status_code = 403
    def __init__(self, message="Permission denied", payload=None):
        super().__init__(message, status_code=403, payload=payload)

class BadRequestError(APIError):
    status_code = 400
    def __init__(self, message="Bad request", payload=None):
        super().__init__(message, status_code=400, payload=payload)
```