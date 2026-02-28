import os
from flask import Flask, jsonify
from flask.cli import with_appcontext
from dotenv import load_dotenv

from .config import config_by_name
from .database import db
from .extensions import jwt, bcrypt, ma, cache, limiter, cors, smorest_api
from .utils.errors import register_error_handlers, APIError
from .utils.logger import setup_logging
from .commands import register_commands

# Import blueprints
from .api.auth import auth_bp
from .api.users import users_bp
from .api.products import products_bp
from .api.categories import categories_bp
from .api.orders import orders_bp


def create_app(config_name):
    """
    Creates and configures the Flask application.
    """
    app = Flask(__name__)

    # Load environment variables if not already loaded (e.g., when not running via wsgi.py)
    if not os.getenv('FLASK_ENV'):
        load_dotenv()

    # Load configuration
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}}) # Allow all origins for API
    smorest_api.init_app(app)

    # Setup logging
    setup_logging(app)

    # Register error handlers
    register_error_handlers(app)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')

    # Register Smorest API views
    smorest_api.register_blueprint(auth_bp)
    smorest_api.register_blueprint(users_bp)
    smorest_api.register_blueprint(products_bp)
    smorest_api.register_blueprint(categories_bp)
    smorest_api.register_blueprint(orders_bp)

    # Register CLI commands
    register_commands(app)

    # Basic route for health check or root access
    @app.route('/')
    def hello_world():
        return jsonify({"message": "Welcome to the E-commerce Backend API!", "status": "running"}), 200

    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify(error="Resource not found", message=str(e)), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify(error="Method not allowed", message=str(e)), 405

    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.exception("An unhandled error occurred: %s", e)
        return jsonify(error="Internal server error", message="Something went wrong on the server."), 500

    # JWT error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Missing or invalid token"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Signature verification failed or malformed token"}), 401

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"message": "Token has expired"}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(callback):
        return jsonify({"message": "Fresh token required"}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(jwt_header, jwt_payload):
        return jsonify({"message": "Token has been revoked"}), 401

    return app