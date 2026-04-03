import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Experiment(Base):
    __tablename__ = "experiments"

    id: int = Column(Integer, primary_key=True, index=True)
    name: str = Column(String, index=True, nullable=False)
    description: str = Column(Text, nullable=True)
    run_id: str = Column(String, unique=True, nullable=False) # Unique identifier for a specific run
    parameters: dict = Column(JSON, nullable=True) # Input parameters for the experiment run
    metrics: dict = Column(JSON, nullable=True) # Output metrics for the experiment run
    artifacts_uri: str = Column(String, nullable=True) # URI to store artifacts (e.g., model weights, plots)
    status: str = Column(String, default="pending") # e.g., pending, running, completed, failed
    model_id: int = Column(Integer, ForeignKey("ml_models.id"), nullable=True) # Optional: link to a registered model
    dataset_id: int = Column(Integer, ForeignKey("datasets.id"), nullable=True) # Optional: link to a used dataset
    created_by_id: int = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    model = relationship("MLModel", backref="experiments")
    dataset = relationship("Dataset", backref="experiments")
    created_by = relationship("User", backref="experiments")

    def __repr__(self):
        return f"<Experiment(id={self.id}, name='{self.name}', run_id='{self.run_id}')>"