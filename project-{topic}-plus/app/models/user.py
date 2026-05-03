```python
"""
SQLAlchemy ORM model for the User entity.

This module defines the database schema for users, including fields for
authentication (email, hashed password), personal details, roles,
and account status. It integrates with the `BaseORM` for common fields.
"""

import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseORM # Import BaseORM from core.database

class UserRole(enum.Enum):
    """
    Enum for different user roles in the system.
    """
    CUSTOMER = "customer"
    ADMIN = "admin"

class User(BaseORM):
    """
    SQLAlchemy model representing a user in the ALX-Shop system.

    Attributes:
        id (int): Primary key, auto-incrementing. Inherited from BaseORM.
        email (str): Unique email address of the user.
        hashed_password (str): Hashed password for authentication.
        full_name (str): Full name of the user.
        is_active (bool): Whether the user account is active.
        role (UserRole): The role of the user (e.g., ADMIN, CUSTOMER).
        created_at (datetime): Timestamp of record creation. Inherited from BaseORM.
        updated_at (datetime): Timestamp of last record update. Inherited from BaseORM.

        orders (relationship): One-to-many relationship with Order model.
    """
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER, nullable=False)

    # Relationships
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        """
        Returns a string representation of the User object.
        """
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}', is_active={self.is_active})>"

```