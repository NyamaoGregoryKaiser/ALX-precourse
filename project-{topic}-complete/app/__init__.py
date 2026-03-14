```python
import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.config import DevelopmentConfig, TestingConfig, ProductionConfig
from app.extensions import db, migrate, jwt, bcrypt, cache, limiter
from app.utils.error_handlers import register_error_handlers
from app.utils.auth_utils import CustomJWTError

def create_app(config_class=DevelopmentConfig):
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(config_class)

    # Initialize extensions
    init_extensions(app)

    # Register error handlers
    register_error_handlers(app)

    # Configure logging
    configure_logging(app)

    # Initialize Sentry for production monitoring
    if app.config.get('SENTRY_DSN'):
        sentry_sdk.init(
            dsn=app.config['SENTRY_DSN'],
            integrations=[FlaskIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=1.0, # Adjust sample rate as needed
            environment=app.config['FLASK_ENV']
        )
        app.logger.info("Sentry initialized.")

    with app.app_context():
        # Import models so Alembic can discover them
        from app.models import user, project, task, comment

        # Register blueprints
        from app.routes.auth import auth_bp
        from app.routes.users import users_bp
        from app.routes.projects import projects_bp
        from app.routes.tasks import tasks_bp

        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(projects_bp, url_prefix='/api/projects')
        app.register_blueprint(tasks_bp, url_prefix='/api/tasks')

        # Serve static frontend (for demonstration)
        @app.route('/')
        def index():
            return app.send_static_file('index.html')

        @app.route('/<path:path>')
        def serve_static(path):
            return app.send_static_file(path)

        # JWT custom error handler
        @jwt.unauthorized_loader
        def unauthorized_response(callback):
            return jsonify(message='Missing Authorization Header'), 401

        @jwt.invalid_token_loader
        def invalid_token_response(callback):
            return jsonify(message='Signature verification failed'), 401

        @jwt.revoked_token_loader
        def revoked_token_response(jwt_header, jwt_payload):
            return jsonify(message='Token has been revoked'), 401

        @jwt.expired_token_loader
        def expired_token_response(jwt_header, jwt_payload):
            return jsonify(message='Token has expired'), 401

        @jwt.token_verification_loader
        def verification_callback(jwt_header, jwt_payload):
            # Example: blacklist check here, or custom claims validation
            return True

        @jwt.user_lookup_loader
        def user_lookup_callback(jwt_header, jwt_data):
            identity = jwt_data["sub"]
            from app.models.user import User
            return User.query.filter_by(id=identity).first()

    app.logger.info(f"App created with config: {config_class.__name__}, Debug: {app.debug}")
    return app

def configure_logging(app):
    """Configures logging for the Flask application."""
    log_level_str = app.config['LOG_LEVEL']
    log_level = getattr(logging, log_level_str, logging.INFO)

    if not os.path.exists('logs'):
        os.mkdir('logs')

    # File handler for general logs
    file_handler = RotatingFileHandler('logs/task_manager.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    file_handler.setLevel(log_level)
    app.logger.addHandler(file_handler)

    # Console handler
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    stream_handler.setLevel(log_level)
    app.logger.addHandler(stream_handler)

    app.logger.setLevel(log_level)
    app.logger.info('Task Manager startup')

```