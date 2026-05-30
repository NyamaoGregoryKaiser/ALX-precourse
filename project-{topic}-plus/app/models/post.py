```python
import datetime
from app.extensions import db
from enum import Enum

class PostStatus(Enum):
    DRAFT = 'draft'
    PUBLISHED = 'published'
    ARCHIVED = 'archived'

    def __str__(self):
        return self.value

class Post(db.Model):
    """
    Represents a blog post or article in the CMS.
    """
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False) # For friendly URLs
    content = db.Column(db.Text, nullable=False)
    summary = db.Column(db.String(500), nullable=True)
    status = db.Column(db.Enum(PostStatus), default=PostStatus.DRAFT, nullable=False)
    featured_image_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False)
    published_at = db.Column(db.DateTime, nullable=True)

    # Foreign Keys
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)

    # Many-to-Many relationship with Media
    media_assets = db.relationship('Media', secondary='post_media', back_populates='posts')

    def __init__(self, title, slug, content, author_id, summary=None, category_id=None, status=PostStatus.DRAFT, featured_image_url=None):
        self.title = title
        self.slug = slug
        self.content = content
        self.author_id = author_id
        self.summary = summary
        self.category_id = category_id
        self.status = status
        self.featured_image_url = featured_image_url
        if status == PostStatus.PUBLISHED and not self.published_at:
            self.published_at = datetime.datetime.now()

    def publish(self):
        """Sets the post status to PUBLISHED and sets published_at timestamp."""
        if self.status != PostStatus.PUBLISHED:
            self.status = PostStatus.PUBLISHED
            self.published_at = datetime.datetime.now()
            return True
        return False

    def unpublish(self):
        """Sets the post status to DRAFT and clears published_at timestamp."""
        if self.status == PostStatus.PUBLISHED:
            self.status = PostStatus.DRAFT
            self.published_at = None
            return True
        return False

    def archive(self):
        """Sets the post status to ARCHIVED."""
        if self.status != PostStatus.ARCHIVED:
            self.status = PostStatus.ARCHIVED
            return True
        return False

    def __repr__(self):
        return f'<Post {self.title}>'

# Association table for Post and Media (many-to-many)
post_media = db.Table('post_media',
    db.Column('post_id', db.Integer, db.ForeignKey('posts.id'), primary_key=True),
    db.Column('media_id', db.Integer, db.ForeignKey('media.id'), primary_key=True)
)
```