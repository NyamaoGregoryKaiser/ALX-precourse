import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True)
    full_name: str = Column(String, index=True)
    email: str = Column(String, unique=True, index=True, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    is_active: bool = Column(Boolean, default=True)
    is_superuser: bool = Column(Boolean, default=False)
    created_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"