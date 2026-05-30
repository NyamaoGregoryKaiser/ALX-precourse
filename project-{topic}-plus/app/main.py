```python
from app import create_app
from app.extensions import db
from flask_migrate import Migrate
import os

app = create_app()

# Initialize Flask-Migrate
# This is typically done outside __init__.py because it needs the app object
# and the db object to be fully initialized.
migrate = Migrate(app, db)

if __name__ == '__main__':
    # When running directly with 'python app/main.py'
    # This is mainly for local development. For production, use Gunicorn.
    with app.app_context():
        # Ensure database tables are created if running without migrations for dev
        # db.create_all() # Commented out, use alembic for migrations

        # If you need to seed data uncomment this:
        # from scripts.seed_db import seed_data
        # seed_data(app)
        app.logger.info("Starting Flask application in development mode.")
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'])

```