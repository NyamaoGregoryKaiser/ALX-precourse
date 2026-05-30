```python
import datetime
from app.extensions import db

class Category(db.Model):
    """
    Represents a category for organizing posts.
    """
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False) # For friendly URLs
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False)

    # Relationships
    posts = db.relationship('Post', backref='category', lazy=True)

    def __init__(self, name, slug, description=None):
        self.name = name
        self.slug = slug
        self.description = description

    def __repr__(self):
        return f'<Category {self.name}>'

```