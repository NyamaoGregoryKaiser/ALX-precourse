import os
import logging
from logging.handlers import RotatingFileHandler

from flask import Flask, jsonify, render_template
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

from config import DevelopmentConfig, TestingConfig, ProductionConfig
from app.extensions import db, migrate, ma, bcrypt, jwt, cache, limiter, swagger, principals
from app.middlewares import register_error_handlers
from app.utils import slugify_content_title

def create_app():
    app = Flask(__name__)

    # Load configuration
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        app.config.from_object(ProductionConfig)
    elif env == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Configure logging
    configure_logging(app)
    app.logger.info(f"CMS App starting in {app.config['FLASK_ENV']} environment.")

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    ma.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    swagger.init_app(app)
    principals.init_app(app) # Initialize Flask-Principal

    # Register blueprints
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api/v1')

    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app.admin import bp as admin_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')

    # Register error handlers
    register_error_handlers(app)

    # Custom Jinja2 filter for slugification (useful in admin for previews)
    app.jinja_env.filters['slugify'] = slugify_content_title

    # Basic route for homepage (can be replaced by a full frontend)
    @app.route('/')
    def index():
        return render_template('index.html', title='Welcome to CMS')

    return app

def configure_logging(app):
    """Configure logging for the Flask application."""
    log_level = app.config.get('LOG_LEVEL', 'INFO').upper()
    app.logger.setLevel(log_level)

    # Remove default Flask handler if present
    for handler in app.logger.handlers:
        if isinstance(handler, logging.StreamHandler):
            app.logger.removeHandler(handler)

    # Console handler for development and testing
    if app.debug or app.testing:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        app.logger.addHandler(handler)

    # File handler for production
    if not app.debug and not app.testing:
        log_dir = 'logs'
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        file_handler = RotatingFileHandler(os.path.join(log_dir, 'cms.log'), maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(log_level)
        app.logger.addHandler(file_handler)

    app.logger.info('Logging configured successfully.')
```