import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from flasgger import Swagger
from flask_cors import CORS

from app.config import Config, DevelopmentConfig, ProductionConfig
from app.utils.logger import setup_logging
from app.utils.error_handlers import register_error_handlers
from app.utils.helpers import load_swagger_template

# Initialize extensions outside of create_app
# This allows them to be initialized once and then bound to the app
db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
cache = Cache()
swagger = Swagger()
cors = CORS() # Initialize CORS

def create_app(config_name='development'):
    app = Flask(__name__)

    # Load configuration
    if config_name == 'production':
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Initialize extensions with the app
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)
    cors.init_app(app) # Initialize CORS with the app

    # Initialize Swagger
    swagger_config = load_swagger_template()
    swagger.init_app(app, config=swagger_config, template=swagger_config)


    # Configure logging
    setup_logging(app)
    app.logger.info(f"Application starting with {config_name} configuration.")

    # Register blueprints for different modules
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.tasks import tasks_bp # Renamed from products to tasks

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')

    # Register custom error handlers
    register_error_handlers(app)

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"msg": "Missing or invalid token. Please log in."}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"msg": "Signature verification failed. Token is invalid."}), 403

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"msg": "Token has expired. Please log in again."}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(callback):
        return jsonify({"msg": "Token has been revoked."}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(callback):
        return jsonify({"msg": "Fresh token required for this action."}), 401

    app.logger.info("Application initialized.")
    return app
```