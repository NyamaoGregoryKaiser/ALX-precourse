from flask import jsonify

class APIError(Exception):
    """Base class for custom API exceptions."""
    status_code = 500

    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        rv['error'] = self.__class__.__name__ # Provide error class name
        return rv


class NotFoundError(APIError):
    status_code = 404

class BadRequestError(APIError):
    status_code = 400

class UnauthorizedError(APIError):
    status_code = 401

class ForbiddenError(APIError):
    status_code = 403

class ConflictError(APIError):
    status_code = 409

class InternalServerError(APIError):
    status_code = 500


def register_error_handlers(app):
    """Registers custom error handlers for the Flask app."""

    @app.errorhandler(APIError)
    def handle_api_error(error):
        app.logger.error(f"API Error: {error.status_code} - {error.message}")
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    # Handle webargs validation errors
    # Flask-Smorest automatically handles these, but if using webargs directly, this is useful
    @app.errorhandler(422)
    def handle_unprocessable_entity(err):
        headers = err.data.get("headers", None)
        messages = err.data.get("messages", ["Invalid request"])
        app.logger.warning(f"Validation Error: {messages}")
        if headers:
            return jsonify({"errors": messages}), 422, headers
        else:
            return jsonify({"errors": messages}), 422