```python
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Category(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    type = Column(String(20), nullable=False) # 'income' or 'expense'
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category", lazy="noload")
    budgets = relationship("Budget", back_populates="category", lazy="noload")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', type='{self.type}')>"

```