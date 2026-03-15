import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger
from app.utils.errors import APIError, NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError
from app.utils.helpers import handle_api_error, log_request_data, log_response_data
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cache = Cache()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"], storage_uri="memory://")
swagger = Swagger()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(os.environ.get('FLASK_CONFIG_TYPE', config_name))

    # Configure logging
    setup_logging(app)
    app.logger.info(f"Application starting with {app.config['FLASK_ENV']} configuration.")

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    swagger.init_app(app, config=swagger_config(app))

    # Import models to ensure they are registered with SQLAlchemy
    from app.models import user, category, product, cart, order

    # Register Blueprints for API
    from app.api.auth import auth_bp
    from app.api.users import users_bp
    from app.api.products import products_bp
    from app.api.cart import cart_bp
    from app.api.orders import orders_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')

    # Register Frontend routes
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    # Global Error Handling
    app.register_error_handler(APIError, handle_api_error)
    app.register_error_handler(404, lambda e: jsonify({"message": "Resource not found"}), 404)
    app.register_error_handler(405, lambda e: jsonify({"message": "Method not allowed"}), 405)
    app.register_error_handler(500, lambda e: jsonify({"message": "An internal server error occurred"}), 500)

    # Request/Response Logging (Optional, for detailed debugging)
    @app.before_request
    def before_request_log():
        log_request_data(request)

    @app.after_request
    def after_request_log(response):
        log_response_data(response)
        return response

    app.logger.info("Application initialized.")
    return app

def setup_logging(app):
    """Configures the application logger."""
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    log_file = app.config.get('LOG_FILE', 'app.log')
    log_format = app.config.get('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    # Create logger for the app
    app.logger.setLevel(log_level)

    # Remove default Flask handler to avoid duplicate messages
    if not app.debug and app.logger.handlers:
        for handler in app.logger.handlers:
            app.logger.removeHandler(handler)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(log_format)
    console_handler.setFormatter(console_formatter)
    app.logger.addHandler(console_handler)

    # File handler for production/non-debug environments
    if not app.debug and not app.testing:
        file_handler = RotatingFileHandler(log_file, maxBytes=1024 * 1024 * 10, backupCount=5) # 10MB per file, 5 backups
        file_handler.setLevel(log_level)
        file_formatter = logging.Formatter(log_format)
        file_handler.setFormatter(file_formatter)
        app.logger.addHandler(file_handler)

    # Configure logging for JWT and other third-party libraries
    logging.getLogger('flask_jwt_extended').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING) # Reduce SQLAlchemy noise
    logging.getLogger('alembic').setLevel(logging.INFO) # Keep alembic info
    logging.getLogger('werkzeug').setLevel(logging.INFO) # Keep werkzeug info (request/response)

def swagger_config(app):
    """
    Configures Flasgger for API documentation.
    """
    return {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec_1',
                "route": '/apispec_1.json',
                "rule_filter": lambda rule: True,  # all in
                "model_filter": lambda tag: True,  # all in
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/api/docs",
        "title": "E-commerce System API",
        "description": "API Documentation for a comprehensive E-commerce platform.",
        "version": "1.0.0",
        "termsOfService": "http://example.com/terms/",
        "contact": {
            "name": "ALX Software Engineering Team",
            "url": "http://example.com/contact",
            "email": "contact@example.com"
        },
        "license": {
            "name": "Apache 2.0",
            "url": "http://www.apache.org/licenses/LICENSE-2.0.html"
        },
        "basePath": "/",
        "schemes": ["http", "https"],
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
            }
        },
        "security": [
            {
                "Bearer": []
            }
        ]
    }