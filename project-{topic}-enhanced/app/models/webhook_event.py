```python
from sqlalchemy import Column, String, JSON, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.merchant import Merchant # To ensure relationship is known

class WebhookEventType(str, enum.Enum):
    PAYMENT_SUCCESS = "payment.success"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_REFUNDED = "payment.refunded"
    PAYMENT_PENDING = "payment.pending"
    # ... more types as needed

class WebhookStatus(str, enum.Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"

class WebhookEvent(Base, TimestampMixin):
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False, index=True)
    event_type = Column(Enum(WebhookEventType), nullable=False, index=True)
    payload = Column(JSON, nullable=False) # The actual data to send to the merchant
    target_url = Column(String, nullable=False) # Merchant's configured webhook URL
    status = Column(Enum(WebhookStatus), default=WebhookStatus.PENDING, nullable=False, index=True)
    last_attempt = Column(Integer, default=0) # Number of delivery attempts

    merchant = relationship("Merchant", back_populates="webhook_events")

    def __repr__(self):
        return f"<WebhookEvent {self.id} | Type: {self.event_type} | Status: {self.status}>"

```