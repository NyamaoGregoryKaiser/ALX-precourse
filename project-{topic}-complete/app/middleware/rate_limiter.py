```python
# app/middleware/rate_limiter.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.utils.logger import logger

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[], # Set global default in config
    storage_uri=None, # Set in init_limiter
    strategy='fixed-window'
)

def init_limiter(app):
    """
    Initializes the rate limiter for the Flask application.
    """
    limiter.init_app(app)
    limiter.storage_uri = app.config['RATELIMIT_STORAGE_URL'] # Explicitly set storage after app is ready
    limiter.default_limits = [app.config['RATELIMIT_DEFAULT']]

    # Example of applying a specific rate limit to an endpoint (can also be done via decorator on route)
    # @app.route('/login')
    # @limiter.limit(app.config['RATELIMIT_AUTHENTICATION_ENDPOINT'])
    # def login():
    #     pass

    logger.info(f"Rate Limiter initialized with default limits: {limiter.default_limits}")
```