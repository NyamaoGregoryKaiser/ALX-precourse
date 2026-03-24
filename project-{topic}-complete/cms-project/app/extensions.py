from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_marshmallow import Marshmallow
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger
from flask_principal import Principal, Permission, RoleNeed

db = SQLAlchemy()
migrate = Migrate()
ma = Marshmallow()
bcrypt = Bcrypt()
jwt = JWTManager()
cache = Cache()
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
swagger = Swagger()
principals = Principal()

# Define Needs and Permissions
admin_permission = Permission(RoleNeed('admin'))
editor_permission = Permission(RoleNeed('editor'))
author_permission = Permission(RoleNeed('author'))
```