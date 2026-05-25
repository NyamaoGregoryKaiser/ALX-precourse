import os
from app import create_app

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Determine environment based on FLASK_ENV, default to development
env = os.environ.get('FLASK_ENV', 'development')
app = create_app(env)

if __name__ == '__main__':
    # This block is for local development with `python wsgi.py`
    # For production, use Gunicorn or similar WSGI server.
    app.run(host='0.0.0.0', port=5000)