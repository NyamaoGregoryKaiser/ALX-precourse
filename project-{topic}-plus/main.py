from dotenv import load_dotenv
import os
import sys

# Load environment variables from .env file
load_dotenv()

# Add the 'app' directory to the Python path
# This allows imports like `from app.config import Config`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app import create_app, db
from app.models import User, Task
from flask_migrate import Migrate
from flask import jsonify, redirect, url_for

# Determine environment for config
env = os.getenv('FLASK_ENV', 'development')
config_name = 'development' if env == 'development' else 'production'

# Create the Flask application instance
app = create_app(config_name)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Flask CLI commands for database
@app.shell_context_processor
def make_shell_context():
    """Register models with Flask shell for easy access."""
    return dict(app=app, db=db, User=User, Task=Task)

# Root URL redirect to Swagger UI
@app.route('/')
def index():
    return redirect(url_for('flasgger.apidocs'))

if __name__ == '__main__':
    # When running with `python main.py` directly, use debug mode
    # For production, Gunicorn (or similar WSGI server) should be used as in Dockerfile/docker-compose.yml
    app.run(debug=True, host='0.0.0.0', port=5000)
```