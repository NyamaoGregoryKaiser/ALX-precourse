```python
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize Flask extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()
cache = Cache()

# Limiter requires a storage URL, configured in config.py
# and a key_func to identify the client (e.g., IP address)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["50 per minute"], # Global default, can be overridden
    storage_uri="memory://", # Placeholder, will be overridden by config.py
    enabled=False # Placeholder, will be overridden by config.py
)
```