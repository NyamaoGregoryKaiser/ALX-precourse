from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import LoginManager

# Initialize Flask extensions, but do not attach to an app yet.
# This allows for creating the app in a factory function.

migrate = Migrate()
jwt = JWTManager()
cache = Cache()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri='redis://localhost:6379/0' # Default, will be overridden by config
)
login_manager = LoginManager()
```