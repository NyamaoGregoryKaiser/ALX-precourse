import os
from flask import Flask, jsonify, render_template, request
from .config import config_by_name
from .extensions import db, migrate, jwt, bcrypt, mail, limiter, cache, configure_logging
from .errors import register_error_handlers
from .cli import register_cli_commands

def create_app(config_name=None):
    """
    Application factory function.
    Initializes and configures the Flask application.
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_by_name[config_name])
    app.config.from_pyfile('config.py', silent=True) # Load instance config

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)

    # Configure logging
    configure_logging(app)

    # Register blueprints (routes)
    from .routes import auth_bp, user_bp, admin_bp
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(user_bp, url_prefix='/api/v1/user')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')

    # Register error handlers
    register_error_handlers(app)

    # Register CLI commands
    register_cli_commands(app)

    # Root route for minimal frontend demo
    @app.route('/')
    def index():
        return render_template('index.html')

    app.logger.info(f"Application created with config: {config_name}")

    return app