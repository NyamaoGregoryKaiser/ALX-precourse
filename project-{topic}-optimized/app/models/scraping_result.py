from app.models.base import Base, db
from sqlalchemy.dialects.postgresql import JSONB

class ScrapingResult(Base):
    __tablename__ = 'scraping_results'

    job_id = db.Column(db.Integer, db.ForeignKey('scraping_jobs.id'), nullable=False, index=True)
    data = db.Column(JSONB, nullable=False) # Stores the scraped data as JSON
    url = db.Column(db.String(2048), nullable=True) # URL from which data was scraped

    # Relationships
    job = db.relationship('ScrapingJob', back_populates='results')

    def __repr__(self):
        return f'<ScrapingResult {self.id} - Job: {self.job_id}>'

    @classmethod
    def get_by_job_id(cls, job_id, user_id=None):
        query = cls.query.filter_by(job_id=job_id)
        # Assuming job has a user_id for authorization
        if user_id:
            query = query.join(cls.job).filter(cls.job.user_id == user_id)
        return query.order_by(cls.created_at.desc()).all()
```