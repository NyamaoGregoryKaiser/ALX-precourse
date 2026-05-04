```python
# app/__init__.py
import os
from flask import Flask, jsonify, render_template
from flask_jwt_extended import JWTManager
from flask_cors import CORS # For frontend integration
from app.config import DevelopmentConfig, TestingConfig, ProductionConfig
from app.core.db import db, migrate
from app.core.redis_cache import cache, init_cache
from app.core.celery_app import init_celery, celery_app
from app.middleware.error_handlers import register_error_handlers
from app.middleware.rate_limiter import limiter, init_limiter
from app.utils.logger import setup_logging, logger

# Import models to ensure they are registered with SQLAlchemy
from app.models.user_model import User, Role
from app.models.target_db_model import TargetDatabase
from app.models.performance_metric_model import PerformanceMetric
from app.models.optimization_suggestion_model import OptimizationSuggestion

jwt = JWTManager()
cors = CORS() # Initialize CORS

def create_app(config_class=DevelopmentConfig):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}}) # Allow all origins for /api routes
    init_cache(app)
    init_limiter(app) # Initialize rate limiter after app config is loaded
    init_celery(app) # Initialize celery after app config is loaded

    # Register blueprints for API endpoints
    from app.api.auth_api import auth_bp
    from app.api.user_api import user_bp
    from app.api.target_db_api import target_db_bp
    from app.api.metric_api import metric_bp
    from app.api.suggestion_api import suggestion_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(target_db_bp, url_prefix='/api/target-dbs')
    app.register_blueprint(metric_bp, url_prefix='/api/metrics')
    app.register_blueprint(suggestion_bp, url_prefix='/api/suggestions')

    # Register error handlers
    register_error_handlers(app)

    # JWT custom error handlers
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Unauthorized Access", "description": "Token is missing or invalid."}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Invalid Token", "description": "Signature verification failed."}), 401
    
    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"message": "Token Expired", "description": "The token has expired."}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(callback):
        return jsonify({"message": "Token Revoked", "description": "The token has been revoked."}), 401

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/login')
    def login_page():
        return render_template('login.html')

    logger.info(f"Application created with config: {config_class.__name__}")
    return app

def get_celery_app():
    """Helper function to retrieve the configured Celery app."""
    return celery_app

if os.getenv('FLASK_ENV') == 'testing':
    app = create_app(TestingConfig)
elif os.getenv('FLASK_ENV') == 'production':
    app = create_app(ProductionConfig)
else:
    app = create_app(DevelopmentConfig) # Default to DevelopmentConfig
```