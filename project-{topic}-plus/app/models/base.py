```python
"""
Base models and common utilities for SQLAlchemy declarative models.

This module defines a `Base` class that all other SQLAlchemy models in the
application should inherit from. It automatically sets a primary key `id`
and `created_at`/`updated_at` timestamps for all derived models.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.orm import declarative_base, declared_attr

# The declarative_base() is a factory function that returns a new base class
# from which all mapped classes will inherit.
# We create it once here and import it in other model files.
Base = declarative_base()

class TimestampMixin:
    """
    Mixin for SQLAlchemy models to automatically add `created_at` and `updated_at` fields.

    These fields are automatically populated with the current timestamp on creation
    and updated on modification.
    """
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class IdMixin:
    """
    Mixin for SQLAlchemy models to automatically add an auto-incrementing integer primary key `id`.
    """
    @declared_attr
    def id(cls):
        """
        Dynamically declares an 'id' column as the primary key.
        This uses `declared_attr` to ensure the column is properly associated
        with each inheriting class's `__table__`.
        """
        return Column(Integer, primary_key=True, index=True, autoincrement=True)

class BaseORM(IdMixin, TimestampMixin, Base):
    """
    Base class for all SQLAlchemy ORM models in the application.

    All application models should inherit from this class to automatically
    include:
    - An auto-incrementing integer `id` primary key.
    - `created_at` and `updated_at` timestamp fields.

    It also provides a default `__repr__` method for better debugging.
    """
    __abstract__ = True # This tells SQLAlchemy not to create a table for BaseORM itself

    def __repr__(self):
        """
        Returns a string representation of the model instance.
        Useful for debugging.
        """
        pk_val = getattr(self, 'id', 'N/A')
        return f"<{self.__class__.__name__}(id={pk_val})>"

```