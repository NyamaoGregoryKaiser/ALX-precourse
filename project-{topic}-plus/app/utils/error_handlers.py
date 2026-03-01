```python
from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException
from marshmallow import ValidationError

def register_error_handlers(app):
    """Registers global error handlers for the Flask application."""

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        """Handle all HTTP exceptions (404, 500, etc.)."""
        current_app.logger.error(f"HTTP Exception: {e.code} - {e.description}")
        response = e.get_response()
        response.data = jsonify({
            "code": e.code,
            "name": e.name,
            "description": e.description,
        }).data
        response.content_type = "application/json"
        return response

    @app.errorhandler(ValidationError)
    def handle_marshmallow_validation_error(e):
        """Handle Marshmallow validation errors."""
        current_app.logger.warning(f"Marshmallow Validation Error: {e.messages}")
        return jsonify({
            "message": "Validation error",
            "errors": e.messages
        }), 400

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        """Handle all other unhandled exceptions."""
        current_app.logger.critical(f"Unhandled Exception: {e}", exc_info=True)
        return jsonify({
            "message": "An unexpected error occurred.",
            "error_type": type(e).__name__
        }), 500
```