```python
# app/core/db.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    """Initializes the database and migration extensions."""
    db.init_app(app)
    migrate.init_app(app, db)
```