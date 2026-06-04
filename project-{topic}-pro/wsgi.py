```python
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Set the application settings module based on FLASK_ENV or APP_SETTINGS_MODULE
# This must happen before app creation to ensure config is loaded properly
if os.getenv("FLASK_ENV") == "testing":
    os.environ["APP_SETTINGS_MODULE"] = "config.TestingConfig"
elif os.getenv("FLASK_ENV") == "production":
    os.environ["APP_SETTINGS_MODULE"] = "config.ProductionConfig"
else: # Default to development
    os.environ["APP_SETTINGS_MODULE"] = "config.DevelopmentConfig"


from app import create_app

# Create the Flask app instance
app = create_app()

if __name__ == '__main__':
    # This block is for development use only when running `python wsgi.py`
    # For production, Gunicorn (as configured in Dockerfile) will use `app` directly.
    app.run(host='0.0.0.0', port=5000, debug=True)
```