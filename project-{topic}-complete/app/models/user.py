```python
from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship

from app.db.base import Base, BaseMixin


class User(Base, BaseMixin):
    """
    SQLAlchemy model for User.
    """
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Relationships (one-to-many)
    datasources = relationship("DataSource", back_populates="owner")
    datasets = relationship("Dataset", back_populates="owner")
    visualizations = relationship("Visualization", back_populates="owner")
    dashboards = relationship("Dashboard", back_populates="owner")

    def __repr__(self):
        return f"<User {self.email}>"
```