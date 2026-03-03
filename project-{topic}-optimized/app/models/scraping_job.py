from app.models.base import Base, db
from enum import Enum

class JobStatus(Enum):
    PENDING = 'PENDING'
    RUNNING = 'RUNNING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    CANCELLED = 'CANCELLED'

    def __str__(self):
        return self.value

class ScrapingJob(Base):
    __tablename__ = 'scraping_jobs'

    scraper_config_id = db.Column(db.Integer, db.ForeignKey('scraper_configs.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    celery_task_id = db.Column(db.String(255), unique=True, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    # Relationships
    config = db.relationship('ScraperConfig', back_populates='jobs')
    user = db.relationship('User', back_populates='scraping_jobs')
    results = db.relationship('ScrapingResult', back_populates='job', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<ScrapingJob {self.id} - Config: {self.scraper_config_id} - Status: {self.status.value}>'

    @classmethod
    def get_all(cls, user_id=None, status=None):
        query = cls.query
        if user_id:
            query = query.filter_by(user_id=user_id)
        if status:
            query = query.filter_by(status=JobStatus[status.upper()])
        return query.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_id(cls, job_id, user_id=None):
        query = cls.query.filter_by(id=job_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
        return query.first()
```