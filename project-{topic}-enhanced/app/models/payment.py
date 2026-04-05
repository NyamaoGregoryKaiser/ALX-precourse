```python
from sqlalchemy import Column, String, Float, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.merchant import Merchant # To ensure relationship is known

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    FAILED = "failed"
    CANCELED = "canceled"
    REQUIRES_ACTION = "requires_action" # e.g., 3D Secure

class PaymentMethod(str, enum.Enum):
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    WALLET = "wallet"
    OTHER = "other"

class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False) # e.g., USD, EUR
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    gateway_payment_id = Column(String, unique=True, index=True, nullable=True) # ID from external gateway
    merchant_order_id = Column(String, nullable=False, index=True) # Merchant's reference for the order
    description = Column(Text, nullable=True)
    customer_email = Column(String, nullable=True)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CARD, nullable=False)
    idempotency_key = Column(String, unique=True, index=True, nullable=True) # For idempotent payment requests

    merchant = relationship("Merchant", back_populates="payments")

    def __repr__(self):
        return f"<Payment {self.id} | Merchant: {self.merchant_id} | Amount: {self.amount} {self.currency} | Status: {self.status}>"

```