```python
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import datetime, UTC

class Transaction(Base):
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String(20), nullable=False) # 'income' or 'expense'
    transaction_date = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction(id={self.id}, amount={self.amount}, type='{self.type}', date='{self.transaction_date}')>"

```