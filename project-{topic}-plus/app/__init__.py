import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask, jsonify
from flask_restx.errors import RestXError
from config import get_config_class
from app.extensions import db, migrate, jwt, api, cache, limiter
from app.errors import register_error_handlers, APIError, InternalServerError

# Import blueprints/namespaces
from app.api.auth import auth_ns
from app.api.users import users_ns
from app.api.data_sources import data_sources_ns
from app.api.visualizations import visualizations_ns
from app.api.dashboards import dashboards_ns

def create_app(config_class_name=None):
    app = Flask(__name__)
    config_class = get_config_class(config_class_name)
    app.config.from_object(config_class)

    _configure_logging(app)
    app.logger.info(f"Application starting with {config_class.__name__} configuration.")

    # Initialize Flask extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)

    # Register API blueprints
    api.init_app(app)
    api.add_namespace(auth_ns)
    api.add_namespace(users_ns)
    api.add_namespace(data_sources_ns)
    api.add_namespace(visualizations_ns)
    api.add_namespace(dashboards_ns)

    # Register error handlers
    register_error_handlers(app)

    # Custom JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Unauthorized. Bearer token missing or invalid.", "status_code": 401}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Invalid token. Signature verification failed or malformed token.", "status_code": 401}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(callback):
        return jsonify({"message": "Token has been revoked.", "status_code": 401}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(callback):
        return jsonify({"message": "Fresh token required for this action.", "status_code": 401}), 401

    @jwt.token_verification_error_loader
    def token_verification_error_response(callback):
        return jsonify({"message": "Token verification failed.", "status_code": 401}), 401

    # Flask-RESTX custom error handler for validation errors
    @api.errorhandler(RestXError)
    def handle_restx_error(error):
        # This catches errors raised by Flask-RESTX itself (e.g. ValidationError)
        app.logger.error(f"Flask-RESTX Error: {error}", exc_info=True)
        if hasattr(error, 'errors') and error.errors: # Validation errors from parsing
            return jsonify({
                'message': 'Input validation failed.',
                'status_code': 400,
                'errors': error.errors
            }), 400
        else:
            return jsonify({
                'message': error.message if hasattr(error, 'message') else 'An API error occurred.',
                'status_code': error.code if hasattr(error, 'code') else 500
            }), error.code if hasattr(error, 'code') else 500

    @app.route('/health')
    @limiter.exempt # Exempt health check from rate limiting
    def health_check():
        """Simple health check endpoint."""
        try:
            # Try a simple DB query
            db.session.execute(db.select(1)).scalar()
            # Try accessing cache
            cache.set('health_check', True, timeout=1)
            cache.get('health_check')
            return jsonify({"status": "healthy", "database": "ok", "cache": "ok"}), 200
        except Exception as e:
            app.logger.error(f"Health check failed: {e}", exc_info=True)
            return jsonify({"status": "unhealthy", "error": str(e)}), 500

    return app

def _configure_logging(app):
    """Configures application logging."""
    if not app.debug and not app.testing:
        # Create log directory if it doesn't exist
        log_dir = os.path.dirname(app.config['LOG_FILE'])
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)

        # File handler
        file_handler = RotatingFileHandler(
            app.config['LOG_FILE'],
            maxBytes=app.config['LOG_MAX_BYTES'],
            backupCount=app.config['LOG_BACKUP_COUNT']
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(app.config['LOG_LEVEL'])
        app.logger.addHandler(file_handler)

    # Console handler (always active, but level can be controlled)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    console_handler.setLevel(app.config['LOG_LEVEL']) # Use app config level
    app.logger.addHandler(console_handler)

    app.logger.setLevel(app.config['LOG_LEVEL'])
    app.logger.propagate = False # Prevent messages from being duplicated by root logger