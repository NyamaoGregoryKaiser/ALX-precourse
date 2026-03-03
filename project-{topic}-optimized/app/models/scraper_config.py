from app.models.base import Base, db
from sqlalchemy.dialects.postgresql import JSONB

class ScraperConfig(Base):
    __tablename__ = 'scraper_configs'

    name = db.Column(db.String(128), unique=True, nullable=False, index=True)
    start_url = db.Column(db.String(2048), nullable=False)
    css_selectors = db.Column(JSONB, nullable=False, default={}) # e.g., {'title': 'h1.product-title', 'price': 'span.price'}
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Relationships
    user = db.relationship('User', back_populates='scraper_configs')
    jobs = db.relationship('ScrapingJob', back_populates='config', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<ScraperConfig {self.name} - {self.start_url}>'

    @classmethod
    def get_all(cls, user_id=None):
        query = cls.query
        if user_id:
            query = query.filter_by(user_id=user_id)
        return query.order_by(cls.created_at.desc()).all()

    @classmethod
    def get_by_id(cls, config_id, user_id=None):
        query = cls.query.filter_by(id=config_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
        return query.first()
```