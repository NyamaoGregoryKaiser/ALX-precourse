```python
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.core.database import Base
from app.models.base import TimestampMixin

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MERCHANT = "merchant"
    CUSTOMER = "customer" # Not directly managing funds, but could be for a wallet system

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(Enum(UserRole), default=UserRole.MERCHANT, nullable=False)

    merchants = relationship("Merchant", back_populates="owner", uselist=True) # A user can own multiple merchants

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
```