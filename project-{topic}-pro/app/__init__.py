```python
import os
import logging
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

# Import extensions
from app.extensions import db, jwt, bcrypt, migrate, cache, limiter
from app.utils.logger import setup_logging
from app.middleware import register_error_handlers, register_rate_limiting

def create_app():
    """
    Factory function to create and configure the Flask application.
    """
    app = Flask(__name__)

    # Load configuration
    config_module = os.environ.get("APP_SETTINGS_MODULE", "config.DevelopmentConfig")
    app.config.from_object(config_module)

    # Setup logging
    setup_logging(app)
    app.logger.info(f"Application starting with config: {config_module}")
    app.logger.info(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app)
    limiter.init_app(app)

    # Register blueprints
    from app.auth.routes import auth_bp
    from app.content.routes import content_bp
    from app.users.routes import users_bp
    from app.admin.routes import admin_bp # Example for future expansion

    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(content_bp, url_prefix='/api/v1/content')
    app.register_blueprint(users_bp, url_prefix='/api/v1/users')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')

    # Register custom CLI commands
    from app.commands import register_commands
    register_commands(app)

    # Register error handlers
    register_error_handlers(app)

    # Register rate limiting on all requests
    # Note: Flask-Limiter also allows per-route limits using a decorator
    if app.config.get("RATELIMIT_ENABLED"):
        app.logger.info("Rate limiting is enabled.")
        # register_rate_limiting(app) # Global rate limiting, can also use @limiter.limit() decorator

    # JWT Error Handling (Custom messages)
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"message": "Request does not contain an access token or it is invalid."}), 401

    @jwt.invalid_token_loader
    def invalid_token_response(callback):
        return jsonify({"message": "Signature verification failed or token is malformed."}), 401

    @jwt.expired_token_loader
    def expired_token_response(callback):
        return jsonify({"message": "The token has expired. Please log in again."}), 401

    @jwt.revoked_token_loader
    def revoked_token_response(callback):
        return jsonify({"message": "The token has been revoked."}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_response(callback):
        return jsonify({"message": "Fresh token required for this action."}), 401

    @jwt.token_verification_failed_loader
    def token_verification_failed_response(jwt_header, jwt_payload):
        return jsonify({"message": "Token verification failed."}), 401

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        from app.models import User
        return User.query.filter_by(id=identity).first()

    @jwt.token_in_blocklist_loader
    def check_if_token_is_revoked(jwt_header, jwt_payload):
        from app.auth.services import is_token_revoked
        jti = jwt_payload["jti"]
        return is_token_revoked(jti)

    # Basic Home Route (for testing if app starts)
    @app.route('/')
    def index():
        return jsonify({"message": "Welcome to the CMS API!", "status": "running"}), 200

    # Frontend example: A simple render of an HTML page
    @app.route('/dashboard')
    def dashboard():
        # In a real application, this would fetch user-specific data
        # and render a more complex template.
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CMS Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; }
                .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                h1 { color: #333; }
                p { color: #666; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .links a { display: block; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>CMS Dashboard</h1>
                <p>This is a placeholder for your CMS frontend. You can integrate a modern frontend framework (React, Vue, Angular) that consumes the API endpoints provided by this backend.</p>
                <div class="links">
                    <a href="/api/docs/swagger-ui">View API Documentation (Swagger UI)</a>
                    <a href="/">Back to API Root</a>
                    <p>Current Backend Time: <span id="currentTime"></span></p>
                </div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const timeElement = document.getElementById('currentTime');
                    if (timeElement) {
                        timeElement.textContent = new Date().toLocaleString();
                    }
                });
            </script>
        </body>
        </html>
        """

    app.logger.info("Application initialized.")
    return app
```