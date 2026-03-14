```python
import logging
from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException
from app.utils.exceptions import CustomError, ResourceNotFound, InvalidInput, DuplicateResource, UnauthorizedAccess, AuthenticationError

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Registers global error handlers for the Flask app."""

    @app.errorhandler(CustomError)
    def handle_custom_error(error):
        """Handler for custom application-specific errors."""
        response = jsonify(message=error.message)
        response.status_code = error.status_code
        logger.warning(f"Custom Error: {error.message} (Status: {error.status_code}) for request {request.path}")
        return response

    @app.errorhandler(ResourceNotFound)
    def handle_resource_not_found(error):
        """Handler for 404 Not Found errors."""
        response = jsonify(message=str(error))
        response.status_code = 404
        logger.warning(f"Resource Not Found: {error} for request {request.path}")
        return response

    @app.errorhandler(InvalidInput)
    def handle_invalid_input(error):
        """Handler for 400 Bad Request (invalid input) errors."""
        response = jsonify(message=str(error))
        response.status_code = 400
        logger.warning(f"Invalid Input: {error} for request {request.path}")
        return response
    
    @app.errorhandler(DuplicateResource)
    def handle_duplicate_resource(error):
        """Handler for 409 Conflict (duplicate resource) errors."""
        response = jsonify(message=str(error))
        response.status_code = 409
        logger.warning(f"Duplicate Resource: {error} for request {request.path}")
        return response

    @app.errorhandler(UnauthorizedAccess)
    def handle_unauthorized_access(error):
        """Handler for 403 Forbidden errors."""
        response = jsonify(message=str(error))
        response.status_code = 403
        logger.warning(f"Unauthorized Access: {error} for request {request.path}")
        return response

    @app.errorhandler(AuthenticationError)
    def handle_authentication_error(error):
        """Handler for 401 Unauthorized (authentication) errors."""
        response = jsonify(message=str(error))
        response.status_code = 401
        logger.warning(f"Authentication Error: {error} for request {request.path}")
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Catch all for Flask's built-in HTTP exceptions."""
        response = jsonify(message=e.description)
        response.status_code = e.code
        logger.warning(f"HTTP Exception: {e.code} - {e.description} for request {request.path}")
        return response

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        """Catch all for unhandled exceptions."""
        # Log the full traceback for unexpected errors
        logger.exception(f"An unhandled error occurred during request to {request.path}: {e}")
        
        # In production, avoid exposing internal error details to clients
        if current_app.debug:
            response = jsonify(message=f"An unexpected error occurred: {str(e)}", traceback=str(e.__traceback__))
        else:
            response = jsonify(message="An unexpected server error occurred. Please try again later.")
        
        response.status_code = 500
        return response

```