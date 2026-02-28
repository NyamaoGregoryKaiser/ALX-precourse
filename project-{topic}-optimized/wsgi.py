import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app import create_app

# Determine the environment from FLASK_ENV, default to 'development'
config_name = os.getenv('FLASK_ENV', 'development')

# Create the Flask application instance
app = create_app(config_name)

if __name__ == '__main__':
    # This block is for local development using `python wsgi.py`
    # In production, Gunicorn will manage the app instance.
    app.run(host='0.0.0.0', port=5000)