import os
import json
import logging

logger = logging.getLogger(__name__)

def load_swagger_template():
    """
    Loads the custom Swagger UI template for Flasgger.
    """
    swagger_template = {
        "swagger": "2.0", # Flasgger default, OpenAPI 3.0 template is preferred for new projects
        "info": {
            "title": "Task Management API",
            "description": "API for managing tasks and users in a secure environment.",
            "contact": {
                "responsibleOrganization": "ALX Software Engineering",
                "responsibleDeveloper": "Your Name",
                "email": "your_email@example.com",
                "url": "https://www.alxafrica.com",
            },
            "termsOfService": "http://me.alxafrica.com/terms",
            "version": "1.0.0"
        },
        "host": "localhost:5000", # Will be replaced by dynamic host in deployment
        "basePath": "/api",
        "schemes": [
            "http",
            "https"
        ],
        "securityDefinitions": {
            "BearerAuth": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
            }
        },
        "security": [
            {
                "BearerAuth": []
            }
        ],
        "tags": [
            {"name": "Auth", "description": "User authentication and authorization operations"},
            {"name": "Users", "description": "User management operations"},
            {"name": "Tasks", "description": "Task management operations"}
        ],
        "definitions": {
            # Common definitions for request/response bodies can go here
            # e.g., error response structure
            "ErrorResponse": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "A custom error code"},
                    "message": {"type": "string", "description": "A human-readable error message"},
                    "status_code": {"type": "integer", "description": "HTTP status code"}
                }
            }
        },
        "externalDocs": {
            "description": "Find out more about Flasgger",
            "url": "http://flasgger.readthedocs.io/en/latest/"
        }
    }
    return swagger_template

def get_current_dir():
    return os.path.dirname(os.path.abspath(__file__))
```