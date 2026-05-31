from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_restx import Api
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
api = Api(
    version='1.0',
    title='Data Visualization API',
    description='A comprehensive API for managing data sources, visualizations, and dashboards.',
    doc='/swagger-ui' # Custom Swagger UI path
)
cache = Cache()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"], # Global default limits
    storage_uri="memory://", # Will be overridden by config.py
    strategy="fixed-window"
)