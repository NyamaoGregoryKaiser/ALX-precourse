```python
import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException, NotFound, InternalServerError
from app.extensions import limiter

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """
    Registers custom error handlers for the Flask application.
    """

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Handle all HTTPException errors."""
        logger.warning(f"HTTPException: {e.code} - {e.description} for {e.name}")
        response = jsonify({
            "code": e.code,
            "name": e.name,
            "description": e.description,
            "status": "error"
        })
        response.status_code = e.code
        return response

    @app.errorhandler(404)
    def handle_not_found_error(e):
        """Handle 404 Not Found errors specifically."""
        logger.warning(f"NotFound: {e.description}")
        return jsonify({
            "code": 404,
            "name": "Not Found",
            "description": "The requested URL was not found on the server. If you entered the URL manually please check your spelling and try again.",
            "status": "error"
        }), 404

    @app.errorhandler(400)
    def handle_bad_request_error(e):
        """Handle 400 Bad Request errors specifically."""
        logger.warning(f"BadRequest: {e.description}")
        return jsonify({
            "code": 400,
            "name": "Bad Request",
            "description": "The request could not be understood or was missing required parameters.",
            "status": "error"
        }), 400

    @app.errorhandler(500)
    def handle_internal_server_error(e):
        """Handle 500 Internal Server Error."""
        logger.exception("Internal Server Error occurred.") # Log full traceback
        return jsonify({
            "code": 500,
            "name": "Internal Server Error",
            "description": "An unexpected error occurred on the server.",
            "status": "error"
        }), 500

    # Generic exception handler for any unhandled exceptions
    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        """Handle all other unhandled exceptions."""
        logger.exception("An unhandled exception occurred.") # Log full traceback
        return jsonify({
            "code": 500,
            "name": "Unhandled Error",
            "description": "An unexpected server error occurred.",
            "status": "error"
        }), 500

def register_rate_limiting(app):
    """
    Registers global rate limiting for the application.
    Individual routes can override this with @limiter.limit() decorator.
    """
    # This automatically applies the default limit to all routes.
    # Individual limits can be applied with @limiter.limit('limit', per_method=True/False, exempt_when=...)
    app.logger.info(f"Global rate limit applied: {app.config['RATELIMIT_DEFAULT']}")
```