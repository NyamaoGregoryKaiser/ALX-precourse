from datetime import datetime
from app import db

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False) # For SEO-friendly URLs
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = db.relationship('Product', backref='category', lazy=True, cascade='all, delete-orphan')

    def __init__(self, name, slug, description=None):
        self.name = name
        self.slug = slug
        self.description = description

    def __repr__(self):
        return f"<Category {self.name}>"