from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from logging.config import dictConfig
import logging

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
mail = Mail()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
cache = Cache()

def configure_logging(app):
    """Configures structured logging for the application."""
    dictConfig({
        'version': 1,
        'formatters': {
            'default': {
                'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
            },
            'json': {
                'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'format': '%(asctime)s %(levelname)s %(name)s %(module)s %(funcName)s %(lineno)d %(message)s'
            }
        },
        'handlers': {
            'wsgi': {
                'class': 'logging.StreamHandler',
                'formatter': 'default' if app.debug else 'json',
                'stream': 'ext://flask.logging.wsgi_errors_stream'
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'formatter': 'json',
                'filename': 'app.log',
                'maxBytes': 1024 * 1024 * 10, # 10 MB
                'backupCount': 5,
            }
        },
        'root': {
            'level': 'INFO',
            'handlers': ['wsgi', 'file']
        }
    })
    app.logger.info(f"Logging configured for environment: {app.config['FLASK_ENV']}")

# Token blacklisting mechanism
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Callback function that takes an unpacked JWT payload and determines
    if the token has been revoked. If the token has been revoked,
    this function should return True, otherwise it should return False.
    """
    jti = jwt_payload["jti"]
    token_in_redis = cache.get(jti)
    return token_in_redis is not None

# Add error handlers for JWT
@jwt.unauthorized_loader
def unauthorized_response(callback):
    return {'message': 'Missing or invalid token. Please log in.'}, 401

@jwt.invalid_token_loader
def invalid_token_response(callback):
    return {'message': 'Signature verification failed. Invalid token.'}, 401

@jwt.expired_token_loader
def expired_token_response(jwt_header, jwt_payload):
    return {'message': 'Token has expired. Please refresh your token.'}, 401

@jwt.revoked_token_loader
def revoked_token_response(jwt_header, jwt_payload):
    return {'message': 'Token has been revoked.'}, 401

@jwt.needs_fresh_token_loader
def needs_fresh_token_response(jwt_header, jwt_payload):
    return {'message': 'Fresh token required for this action.'}, 401