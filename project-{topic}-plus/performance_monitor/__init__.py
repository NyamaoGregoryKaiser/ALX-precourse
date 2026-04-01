```python
import os
import logging
from logging.handlers import RotatingFileHandler

from flask import Flask, jsonify, redirect, url_for, flash
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_claims
from flask_restx import Api
from werkzeug.exceptions import HTTPException
from functools import wraps

from performance_monitor.config import config_by_name
from performance_monitor.extensions import db, migrate, jwt, cache, limiter, cors, scheduler
from performance_monitor.utils.errors import handle_api_error
from performance_monitor.tasks import start_scheduler_job, stop_scheduler_job

# API Namespaces
from performance_monitor.api.auth_ns import api as auth_ns
from performance_monitor.api.user_ns import api as user_ns
from performance_monitor.api.service_ns import api as service_ns
from performance_monitor.api.endpoint_ns import api as endpoint_ns
from performance_monitor.api.metric_ns import api as metric_ns

# Frontend Blueprints
from performance_monitor.frontend.routes import frontend_bp

def create_app(config_name=None):
    """
    Application factory function.
    Initializes and configures the Flask application.
    """
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}}) # Allow CORS for API
    scheduler.init_app(app)

    # Initialize API
    api = Api(app,
              version='1.0',
              title='Performance Monitor API',
              description='API for managing services, endpoints, and performance metrics.',
              doc='/api/docs',
              prefix='/api')

    api.add_namespace(auth_ns)
    api.add_namespace(user_ns)
    api.add_namespace(service_ns)
    api.add_namespace(endpoint_ns)
    api.add_namespace(metric_ns)

    # Register frontend blueprint
    app.register_blueprint(frontend_bp)

    # Configure logging
    configure_logging(app)

    # Register error handlers
    register_error_handlers(app, api)

    # JWT custom claims and error handling
    configure_jwt_callbacks(app)

    # Initialize and start scheduler if not in testing mode
    if not app.config.get('TESTING'):
        with app.app_context():
            start_scheduler_job(app)
            app.logger.info("Scheduler started.")

    return app

def configure_logging(app):
    """
    Configures application logging.
    """
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/performance_monitor.log', maxBytes=10240,
                                       backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Performance Monitor startup')

def register_error_handlers(app, api):
    """
    Registers custom error handlers for the Flask app and Flask-RESTX API.
    """
    @app.errorhandler(404)
    def not_found(error):
        if app.config.get('DEBUG'):
            app.logger.warning(f"404 Not Found: {error}")
        return jsonify({"message": "The requested URL was not found on the server."}), 404

    @app.errorhandler(500)
    def internal_server_error(error):
        if app.config.get('DEBUG'):
            app.logger.exception(f"500 Internal Server Error: {error}")
        return jsonify({"message": "An unexpected error occurred."}), 500

    # Custom error handler for all API errors
    api.handle_error = handle_api_error

    # Catch all HTTPExceptions for API for consistent error response
    @api.errorhandler(HTTPException)
    def handle_http_exception(error):
        return handle_api_error(error)

def configure_jwt_callbacks(app):
    """
    Configures JWT callbacks for custom claims and error handling.
    """
    @jwt.user_claims_loader
    def add_claims_to_access_token(user):
        """Adds 'is_admin' claim to the access token."""
        return {'is_admin': user.is_admin}

    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Missing or invalid token. Please log in."}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Signature verification failed. Token is invalid."}), 401

    @jwt.expired_token_loader
    def expired_token_response():
        return jsonify({"message": "Token has expired. Please refresh or log in again."}), 401

    @jwt.needs_fresh_token_loader
    def token_not_fresh_response():
        return jsonify({"message": "Fresh token required. Please re-authenticate."}), 401

    @jwt.revoked_token_loader
    def revoked_token_response():
        return jsonify({"message": "Token has been revoked."}), 401

def admin_required(fn):
    """
    Decorator to ensure the current user has admin privileges.
    Requires a valid JWT token to be present.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt_claims()
        if not claims.get('is_admin'):
            return jsonify(msg='Administrators only!'), 403
        return fn(*args, **kwargs)
    return wrapper

if __name__ == '__main__':
    # This block is typically for development purposes.
    # In production, use a WSGI server like Gunicorn.
    app = create_app('development')
    app.run(debug=True, host='0.0.0.0', port=5000)

```