from app.extensions import api
from flask_jwt_extended import JWTManager

# Initialize JWT here if not done in app init or pass the app directly
# jwt = JWTManager() # Removed as jwt is initialized in app/__init__.py

# Import namespaces for registration
from .auth import auth_ns
from .users import users_ns
from .data_sources import data_sources_ns
from .visualizations import visualizations_ns
from .dashboards import dashboards_ns

# No need to register namespaces here, it's done in app/__init__.py
# when calling api.add_namespace() for each ns object.
# This file mainly serves to make the api package importable and
# to declare the global API object from extensions.py.