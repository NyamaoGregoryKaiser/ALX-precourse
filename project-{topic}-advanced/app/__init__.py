import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask, jsonify, request, redirect, url_for, session, flash
from flask_login import LoginManager, login_user, logout_user, current_user
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, unset_jwt_cookies
from datetime import timedelta
from werkzeug.security import check_password_hash

from app.config import config_by_name
from app.database import db
from app.models import User, MonitoredDatabase, OptimizationTask, Report, Metric
from app.utils.errors import APIError
from app.utils.helpers import get_current_user_from_db
from app.extensions import migrate, jwt, cache, limiter, login_manager # Import all extensions

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    login_manager.init_app(app)

    # Configure Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    login_manager.login_view = 'web_login'
    login_manager.login_message_category = 'info'
    login_manager.login_message = 'Please log in to access this page.'

    # Configure logging
    setup_logging(app)

    # Register blueprints for API
    from app.api.auth_routes import auth_api_bp
    from app.api.db_routes import db_api_bp
    from app.api.task_routes import task_api_bp
    from app.api.report_routes import report_api_bp
    from app.api.metric_routes import metric_api_bp

    app.register_blueprint(auth_api_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(db_api_bp, url_prefix='/api/v1/databases')
    app.register_blueprint(task_api_bp, url_prefix='/api/v1/tasks')
    app.register_blueprint(report_api_bp, url_prefix='/api/v1/reports')
    app.register_blueprint(metric_api_bp, url_prefix='/api/v1/metrics')

    # Register web routes
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    # Setup JWT user loading for API
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return db.session.get(User, identity)

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Missing or invalid token", "error_code": "UNAUTHORIZED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Signature verification failed", "error_code": "INVALID_TOKEN"}), 401

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"message": "Token has expired", "error_code": "TOKEN_EXPIRED"}), 401

    # Global Error Handler
    @app.errorhandler(APIError)
    def handle_api_error(error):
        app.logger.error(f"API Error: {error.status_code} - {error.message}")
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(404)
    def not_found_error(error):
        app.logger.warning(f"Not Found: {request.url}")
        if request.path.startswith('/api/'):
            return jsonify({"message": "Resource not found", "error_code": "NOT_FOUND"}), 404
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback() # Ensure database session is rolled back on internal error
        app.logger.exception(f"Internal Server Error: {error}")
        if request.path.startswith('/api/'):
            return jsonify({"message": "Internal server error", "error_code": "INTERNAL_SERVER_ERROR"}), 500
        return render_template('500.html'), 500

    app.logger.info(f'DBOptiFlow app started in {config_name} mode.')

    return app

def setup_logging(app):
    log_level_str = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    # Clear any existing handlers
    app.logger.handlers.clear()
    
    # Console logger
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    app.logger.addHandler(console_handler)

    # File logger for production
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/dboptiflow.log', maxBytes=10240,
                                           backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(log_level)
        app.logger.addHandler(file_handler)

    app.logger.setLevel(log_level)
```