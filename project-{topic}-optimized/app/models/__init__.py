from .user import User, UserRole, user_roles # Important for Alembic
from .category import Category
from .product import Product
from .order import Order, OrderItem
# This file is crucial for SQLAlchemy and Alembic to discover all models.
# Make sure all models are imported here.