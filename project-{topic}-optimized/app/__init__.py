import os
import logging
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from cachelib.redis import RedisCache
from celery import Celery

from config import Config, DevelopmentConfig, TestingConfig, ProductionConfig
from app.utils.logging_config import setup_logging
from app.utils.errors import APIError, handle_api_error
from app.utils.rate_limiter import configure_rate_limits

db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"], # Default for all endpoints
    storage_uri="redis://redis:6379/2", # Separate DB for rate limiter
    strategy="fixed-window"
)
cache = RedisCache(host=Config.CACHE_REDIS_HOST, port=Config.CACHE_REDIS_PORT, db=Config.CACHE_REDIS_DB)
celery_app = Celery(__name__)

def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # Load configuration
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        app.config.from_object(ProductionConfig)
    elif env == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    cache.init_app(app)

    # Configure logging
    setup_logging(app)
    app.logger.info(f"Application starting with environment: {app.config['FLASK_ENV']}")

    # Configure Celery
    app.config.from_mapping(
        CELERY_BROKER_URL=app.config['CELERY_BROKER_URL'],
        CELERY_RESULT_BACKEND=app.config['CELERY_RESULT_BACKEND'],
        CELERY_TASK_SERIALIZER='json',
        CELERY_ACCEPT_CONTENT=['json'],
        CELERY_RESULT_SERIALIZER='json',
        CELERY_TIMEZONE='UTC',
        CELERY_ENABLE_UTC=True,
    )
    celery_app.conf.update(app.config)
    # Ensure tasks can access app context if needed
    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    celery_app.Task = ContextTask

    # Register Blueprints
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    from app.views import bp as main_bp
    app.register_blueprint(main_bp)

    # Register error handler
    app.register_error_handler(APIError, handle_api_error)

    # Configure global rate limits
    configure_rate_limits(app, limiter)

    with app.app_context():
        # Import models and services to ensure they are registered with SQLAlchemy and Celery
        import app.models
        import app.services
        import app.tasks.scraping_tasks # noqa: F401 for celery to discover tasks

        # Optional: create tables for the first time if using `flask run` directly without `flask db upgrade`
        # In production, `flask db upgrade` should be run explicitly
        # db.create_all()

    @app.route('/health')
    def health_check():
        """Basic health check endpoint."""
        return jsonify({"status": "healthy", "message": "Scraping service is up and running!"}), 200

    return app

```