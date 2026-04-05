```python
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.user import User # To ensure relationship is known

class Merchant(Base, TimestampMixin):
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False) # Secret key for merchant to authenticate API calls
    is_active = Column(Boolean, default=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="merchants")
    payments = relationship("Payment", back_populates="merchant", uselist=True)
    webhook_events = relationship("WebhookEvent", back_populates="merchant", uselist=True)

    def __repr__(self):
        return f"<Merchant {self.name}>"

```