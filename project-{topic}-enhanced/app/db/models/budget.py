```python
from sqlalchemy import Column, Integer, Float, ForeignKey, String, Date
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from datetime import date

class Budget(Base):
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    def __repr__(self):
        return f"<Budget(id={self.id}, amount={self.amount}, category_id={self.category_id}, '{self.start_date}' to '{self.end_date}')>"

```