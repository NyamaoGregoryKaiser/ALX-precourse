```python
# app/middleware/error_handlers.py
from flask import jsonify
from app.utils.errors import APIError
from app.utils.logger import logger

def register_error_handlers(app):
    """
    Registers custom error handlers for the Flask application.
    """
    @app.errorhandler(APIError)
    def handle_api_error(error):
        """Handle custom APIError exceptions."""
        response = jsonify(error.to_dict())
        response.status_code = error.code
        logger.error(f"API Error ({error.code}): {error.message} - {error.description}")
        return response

    @app.errorhandler(400)
    def handle_bad_request(e):
        return handle_api_error(APIError(code=400, message="Bad Request", description=str(e)))

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return handle_api_error(APIError(code=401, message="Unauthorized", description=str(e)))

    @app.errorhandler(403)
    def handle_forbidden(e):
        return handle_api_error(APIError(code=403, message="Forbidden", description=str(e)))

    @app.errorhandler(404)
    def handle_not_found(e):
        return handle_api_error(APIError(code=404, message="Not Found", description=str(e)))

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return handle_api_error(APIError(code=405, message="Method Not Allowed", description=str(e)))

    @app.errorhandler(500)
    def handle_internal_server_error(e):
        """Handle general internal server errors."""
        logger.exception("An unhandled internal server error occurred.")
        return handle_api_error(APIError(code=500, message="Internal Server Error", description=str(e)))
```