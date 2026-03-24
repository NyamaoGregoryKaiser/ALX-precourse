from flask import jsonify, current_app, render_template
from werkzeug.exceptions import HTTPException
from marshmallow import ValidationError

def register_error_handlers(app):
    """Register custom error handlers for the application."""

    @app.errorhandler(400)
    def bad_request(error):
        current_app.logger.warning(f"Bad Request: {error.description}")
        return api_error_response(400, "Bad Request", error.description)

    @app.errorhandler(401)
    def unauthorized(error):
        current_app.logger.warning(f"Unauthorized: {error.description}")
        return api_error_response(401, "Unauthorized", "Authentication required or invalid credentials.")

    @app.errorhandler(403)
    def forbidden(error):
        current_app.logger.warning(f"Forbidden: {error.description}")
        return api_error_response(403, "Forbidden", "You do not have permission to access this resource.")

    @app.errorhandler(404)
    def not_found(error):
        current_app.logger.warning(f"Not Found: {error.description}")
        # For non-API routes, render a template
        if 'api/v1' not in str(error.request.url): # Check if the request path contains API prefix
             return render_template('404.html'), 404
        return api_error_response(404, "Not Found", "The requested URL was not found on the server.")

    @app.errorhandler(405)
    def method_not_allowed(error):
        current_app.logger.warning(f"Method Not Allowed: {error.description}")
        return api_error_response(405, "Method Not Allowed", "The method is not allowed for the requested URL.")

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        current_app.logger.warning(f"Rate Limit Exceeded: {error.description}")
        return api_error_response(429, "Too Many Requests", "Rate limit exceeded. Please try again later.")

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        current_app.logger.warning(f"Validation Error: {error.messages}")
        return api_error_response(400, "Validation Error", error.messages)

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Return JSON instead of HTML for HTTP errors."""
        current_app.logger.error(f"HTTP Exception: {e.code} - {e.description}")
        return api_error_response(e.code, e.name, e.description)

    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all unhandled exceptions."""
        current_app.logger.exception("An unhandled exception occurred.")
        return api_error_response(500, "Internal Server Error", "An unexpected error occurred.")


def api_error_response(status_code, error_type, message):
    """Helper function to create a consistent API error response."""
    response = jsonify({
        "status": "error",
        "code": status_code,
        "type": error_type,
        "message": message
    })
    response.status_code = status_code
    return response
```