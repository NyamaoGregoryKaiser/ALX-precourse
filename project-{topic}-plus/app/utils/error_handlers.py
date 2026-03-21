import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException
from webargs.flaskparser import parser
from marshmallow import ValidationError
from app.utils.exceptions import CustomError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, ConflictError

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """
    Registers custom error handlers for the Flask application.
    This provides consistent API error responses.
    """

    # Handle webargs validation errors
    @parser.error_handler
    def handle_webargs_validation_error(error, req, schema, error_status_code, error_headers):
        logger.warning(f"Webargs validation error: {error.messages}")
        response = jsonify({
            "code": "BAD_REQUEST",
            "message": "Invalid input parameters.",
            "errors": error.messages
        })
        response.status_code = error_status_code or 400
        return response

    # Handle Marshmallow validation errors (e.g., in `validate_json_body`)
    @app.errorhandler(ValidationError)
    def handle_marshmallow_validation_error(error):
        logger.warning(f"Marshmallow validation error: {error.messages}")
        response = jsonify({
            "code": "BAD_REQUEST",
            "message": "Invalid request body.",
            "errors": error.messages
        })
        response.status_code = 400
        return response

    # Handle custom application errors
    @app.errorhandler(CustomError)
    def handle_custom_exception(error):
        logger.error(f"Custom app error: {error.message} (Code: {error.code}, Status: {error.status_code})", exc_info=True)
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(UnauthorizedError)
    def handle_unauthorized_error(error):
        return handle_custom_exception(error)

    @app.errorhandler(ForbiddenError)
    def handle_forbidden_error(error):
        return handle_custom_exception(error)

    @app.errorhandler(NotFoundError)
    def handle_not_found_error(error):
        return handle_custom_exception(error)

    @app.errorhandler(BadRequestError)
    def handle_bad_request_error(error):
        return handle_custom_exception(error)

    @app.errorhandler(ConflictError)
    def handle_conflict_error(error):
        return handle_custom_exception(error)

    # Handle generic HTTP exceptions (e.g., 404 Not Found, 405 Method Not Allowed)
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        logger.error(f"HTTP exception: {e.code} - {e.description}", exc_info=True)
        response = jsonify({
            "code": "HTTP_ERROR",
            "message": e.description,
            "status_code": e.code
        })
        response.status_code = e.code
        return response

    # Handle all other unexpected exceptions
    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        logger.critical(f"An unhandled exception occurred: {e}", exc_info=True)
        response = jsonify({
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
            "errors": str(e) if app.debug else None
        })
        response.status_code = 500
        return response
```