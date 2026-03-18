```python
from sqlalchemy import Column, ForeignKey, String, Text, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base, BaseMixin


class Dashboard(Base, BaseMixin):
    """
    SQLAlchemy model for Dashboard.
    Organizes multiple visualizations.
    """
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    layout = Column(JSON, nullable=False)  # JSON representing the layout and included visualizations (e.g., list of visualization IDs, their position/size)
    owner_id = Column(ForeignKey("users.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="dashboards")

    def __repr__(self):
        return f"<Dashboard {self.name}>"
```