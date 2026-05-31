from werkzeug.exceptions import HTTPException
import logging

log = logging.getLogger(__name__)

class APIError(HTTPException):
    code = 500
    description = 'An unexpected error occurred.'

    def __init__(self, description=None, code=None, errors=None):
        super().__init__(description)
        if code is not None:
            self.code = code
        self.description = description if description else self.__class__.description
        self.errors = errors if errors else []

    def to_dict(self):
        return {
            'message': self.description,
            'status_code': self.code,
            'errors': self.errors
        }

class BadRequestError(APIError):
    code = 400
    description = 'Bad Request. The request was malformed or invalid.'

class UnauthorizedError(APIError):
    code = 401
    description = 'Unauthorized. Authentication is required or has failed.'

class ForbiddenError(APIError):
    code = 403
    description = 'Forbidden. You do not have permission to access this resource.'

class NotFoundError(APIError):
    code = 404
    description = 'Not Found. The requested resource could not be found.'

class ConflictError(APIError):
    code = 409
    description = 'Conflict. The request could not be completed due to a conflict with the current state of the resource.'

class UnprocessableEntityError(APIError):
    code = 422
    description = 'Unprocessable Entity. The server understands the content type of the request entity, and the syntax of the request entity is correct, but it was unable to process the contained instructions.'

class InternalServerError(APIError):
    code = 500
    description = 'Internal Server Error. An unexpected condition prevented the server from fulfilling the request.'

def register_error_handlers(app):
    """Registers custom error handlers for the Flask application."""

    @app.errorhandler(APIError)
    def handle_api_error(error):
        log.error(f"API Error [{error.code}]: {error.description} - Details: {error.errors}", exc_info=True)
        return error.to_dict(), error.code

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        log.error(f"HTTP Exception [{e.code}]: {e.description}", exc_info=True)
        return {'message': e.description, 'status_code': e.code}, e.code

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        log.critical(f"Unhandled Exception: {e}", exc_info=True)
        # In production, avoid exposing internal details of generic exceptions
        if app.config['DEBUG']:
            response = {
                'message': 'An unhandled server error occurred.',
                'status_code': 500,
                'error_detail': str(e)
            }
        else:
            response = {
                'message': 'An unhandled server error occurred. Please try again later.',
                'status_code': 500
            }
        return response, 500