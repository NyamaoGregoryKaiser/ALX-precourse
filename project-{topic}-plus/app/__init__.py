```python
import os
import logging
from logging.handlers import RotatingFileHandler

from flask import Flask, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.config import config_by_name

# Initialize Flask extensions outside the app factory
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cache = Cache()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions with the app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)

    # Setup logging
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/ecommerce.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('ShopSwift startup')

    # Register blueprints for API endpoints
    from app.api.auth import auth_bp
    from app.api.users import users_bp
    from app.api.categories import categories_bp
    from app.api.products import products_bp
    from app.api.cart import cart_bp
    from app.api.orders import orders_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')

    # Register global error handlers
    from app.utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    # JWT custom error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Missing Authorization Header"}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Signature verification failed"}), 401

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"message": "Token has expired"}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(callback):
        return jsonify({"message": "Token has been revoked"}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(callback):
        return jsonify({"message": "Fresh token required"}), 401

    # --- Basic Frontend Routes (for demonstration) ---
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/login')
    def login_page():
        return render_template('login.html')

    @app.route('/register')
    def register_page():
        return render_template('register.html')
    # --- End Basic Frontend Routes ---

    return app
```