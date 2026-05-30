```python
from flask import Flask, jsonify, render_template, request, g
from app.config import get_config_class
from app.extensions import db, ma, jwt, cache, limiter
from app.utils.logger import setup_logging
from app.utils.errors import APIError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ServerError
from app.utils.jwt_handlers import configure_jwt_callbacks
from http import HTTPStatus
import logging

def create_app():
    """
    Factory function to create and configure the Flask application.
    """
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(get_config_class())

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    jwt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)

    # Configure logging
    setup_logging(app)

    # Configure JWT callbacks (error handlers, user_loader, token_in_blocklist_loader)
    configure_jwt_callbacks(app)

    # Register Blueprints for API routes
    from app.routes import auth_bp, user_bp, category_bp, post_bp, media_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(category_bp, url_prefix='/api/categories')
    app.register_blueprint(post_bp, url_prefix='/api/posts')
    app.register_blueprint(media_bp, url_prefix='/api/media')

    # Register global error handlers
    register_error_handlers(app)

    # Basic frontend route for demonstration
    @app.route('/')
    def index():
        app.logger.info("Serving index page.")
        return render_template('index.html', app_name="ALX CMS")

    @app.before_request
    def log_request_info():
        """Logs incoming request details."""
        app.logger.debug(f"Incoming Request: {request.method} {request.url}")
        app.logger.debug(f"Headers: {request.headers}")
        if request.is_json:
            app.logger.debug(f"JSON Data: {request.get_json(silent=True)}")
        elif request.form:
            app.logger.debug(f"Form Data: {request.form}")

    @app.after_request
    def log_response_info(response):
        """Logs outgoing response details."""
        app.logger.debug(f"Outgoing Response: {response.status_code} {request.path}")
        app.logger.debug(f"Response Headers: {response.headers}")
        return response

    app.logger.info(f"Application created and configured for {app.config['FLASK_ENV']} environment.")
    return app

def register_error_handlers(app):
    """
    Registers custom error handlers for the application.
    """
    @app.errorhandler(APIError)
    def handle_api_error(error):
        app.logger.error(f"API Error caught: {error.message} (Status: {error.status_code})", exc_info=True)
        return jsonify({'message': error.message}), error.status_code

    @app.errorhandler(HTTPStatus.BAD_REQUEST) # 400
    def handle_bad_request(e):
        app.logger.error(f"Bad Request: {e}", exc_info=True)
        return jsonify(message="The browser (or proxy) sent a request that this server could not understand."), HTTPStatus.BAD_REQUEST

    @app.errorhandler(HTTPStatus.UNAUTHORIZED) # 401
    def handle_unauthorized(e):
        app.logger.warning(f"Unauthorized access attempt: {e}", exc_info=True)
        return jsonify(message="Unauthorized. Please authenticate."), HTTPStatus.UNAUTHORIZED

    @app.errorhandler(HTTPStatus.FORBIDDEN) # 403
    def handle_forbidden(e):
        app.logger.warning(f"Forbidden access attempt: {e}", exc_info=True)
        return jsonify(message="Forbidden. You do not have permission to access this resource."), HTTPStatus.FORBIDDEN

    @app.errorhandler(HTTPStatus.NOT_FOUND) # 404
    def handle_not_found(e):
        app.logger.warning(f"Resource not found: {request.path}", exc_info=True)
        return jsonify(message="The requested URL was not found on the server."), HTTPStatus.NOT_FOUND

    @app.errorhandler(HTTPStatus.METHOD_NOT_ALLOWED) # 405
    def handle_method_not_allowed(e):
        app.logger.warning(f"Method Not Allowed: {request.method} on {request.path}", exc_info=True)
        return jsonify(message="The method is not allowed for the requested URL."), HTTPStatus.METHOD_NOT_ALLOWED

    @app.errorhandler(HTTPStatus.TOO_MANY_REQUESTS) # 429 - Limiter specific
    def handle_rate_limit_exceeded(e):
        app.logger.warning(f"Rate limit exceeded for {request.remote_addr}: {e}", exc_info=True)
        return jsonify(message="Rate limit exceeded. Too many requests."), HTTPStatus.TOO_MANY_REQUESTS

    @app.errorhandler(Exception) # Catch all other exceptions
    def handle_general_exception(e):
        app.logger.critical(f"An unhandled exception occurred: {e}", exc_info=True)
        return jsonify(message="An unexpected error occurred on the server."), HTTPStatus.INTERNAL_SERVER_ERROR

```