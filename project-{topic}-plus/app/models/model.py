import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class MLModel(Base):
    __tablename__ = "ml_models"

    id: int = Column(Integer, primary_key=True, index=True)
    name: str = Column(String, index=True, nullable=False)
    version: str = Column(String, nullable=False) # e.g., v1.0, 2023-10-26
    description: str = Column(Text, nullable=True)
    model_path: str = Column(String, nullable=False) # e.g., S3 path or local storage path to the serialized model file
    framework: str = Column(String, nullable=True) # e.g., scikit-learn, TensorFlow, PyTorch
    task_type: str = Column(String, nullable=True) # e.g., classification, regression, object_detection
    hyperparameters: dict = Column(JSON, nullable=True) # Stored as JSONB in PostgreSQL
    metrics: dict = Column(JSON, nullable=True) # Stored as JSONB in PostgreSQL (e.g., {"accuracy": 0.95, "precision": 0.88})
    registered_by_id: int = Column(Integer, ForeignKey("users.id"), nullable=False)
    registered_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    registered_by = relationship("User", backref="ml_models")

    __table_args__ = (
        # Ensure name and version are unique together
        (
            {"name": "uq_ml_model_name_version", "unique": True},
            "name", "version"
        )
    )

    def __repr__(self):
        return f"<MLModel(id={self.id}, name='{self.name}', version='{self.version}')>"