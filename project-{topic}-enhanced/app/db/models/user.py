```python
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="owner", lazy="noload")
    categories = relationship("Category", back_populates="owner", lazy="noload")
    budgets = relationship("Budget", back_populates="owner", lazy="noload")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"

```