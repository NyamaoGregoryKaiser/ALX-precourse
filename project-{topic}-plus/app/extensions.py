```python
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_jwt_extended import JWTManager
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()
cache = Cache()
limiter = Limiter(
    key_func=get_remote_address, # Identify users by IP for rate limiting
    default_limits=["200 per day", "50 per hour"], # Default limits if not specified
    storage_uri="memory://" # Default in-memory, will be overridden by config
)

# You can add more extensions here as needed, e.g., Flask-Migrate (Alembic)
# from flask_migrate import Migrate
# migrate = Migrate()
```