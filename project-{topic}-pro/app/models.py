```python
from datetime import datetime
from app.extensions import db, bcrypt
from sqlalchemy_utils import UUIDType
import uuid

class User(db.Model):
    """
    User model representing a user in the CMS.
    """
    __tablename__ = 'users'

    id = db.Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='contributor', nullable=False) # admin, editor, author, contributor
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    posts = db.relationship('Post', back_populates='author', lazy=True)
    media_items = db.relationship('Media', back_populates='uploader', lazy=True)

    def __init__(self, username, email, password, role='contributor'):
        self.username = username
        self.email = email
        self.password = password # Uses the setter for hashing
        self.role = role

    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')

    @password.setter
    def password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class Category(db.Model):
    """
    Category model for organizing content (e.g., blog posts).
    """
    __tablename__ = 'categories'

    id = db.Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    posts = db.relationship('Post', back_populates='category', lazy=True)

    def __init__(self, name, slug, description=None):
        self.name = name
        self.slug = slug
        self.description = description

    def __repr__(self):
        return f'<Category {self.name}>'

class Tag(db.Model):
    """
    Tag model for free-form categorization of content.
    """
    __tablename__ = 'tags'

    id = db.Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    slug = db.Column(db.String(50), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __init__(self, name, slug):
        self.name = name
        self.slug = slug

    def __repr__(self):
        return f'<Tag {self.name}>'

# Association table for many-to-many relationship between Post and Tag
post_tags = db.Table(
    'post_tags',
    db.Column('post_id', UUIDType(binary=False), db.ForeignKey('posts.id'), primary_key=True),
    db.Column('tag_id', UUIDType(binary=False), db.ForeignKey('tags.id'), primary_key=True)
)

class Post(db.Model):
    """
    Post model representing an article or blog post.
    """
    __tablename__ = 'posts'

    id = db.Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    title = db.Column(db.String(255), nullable=False, index=True)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='draft', nullable=False) # draft, pending, published, archived
    visibility = db.Column(db.String(20), default='public', nullable=False) # public, private, password_protected
    published_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Foreign Keys
    author_id = db.Column(UUIDType(binary=False), db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(UUIDType(binary=False), db.ForeignKey('categories.id'), nullable=True) # A post can belong to a category

    # Relationships
    author = db.relationship('User', back_populates='posts')
    category = db.relationship('Category', back_populates='posts')
    tags = db.relationship('Tag', secondary=post_tags, backref=db.backref('posts', lazy='dynamic'), lazy='joined')
    comments = db.relationship('Comment', back_populates='post', lazy=True, cascade="all, delete-orphan")
    media_items = db.relationship('Media', secondary='post_media', back_populates='posts', lazy='joined') # Many-to-Many with Media

    def __init__(self, title, slug, content, author_id, category_id=None, excerpt=None, status='draft', visibility='public', published_at=None):
        self.title = title
        self.slug = slug
        self.content = content
        self.author_id = author_id
        self.category_id = category_id
        self.excerpt = excerpt
        self.status = status
        self.visibility = visibility
        self.published_at = published_at if published_at else (datetime.utcnow() if status == 'published' else None)

    def __repr__(self):
        return f'<Post {self.title}>'

class Comment(db.Model):
    """
    Comment model for user comments on posts.
    """
    __tablename__ = 'comments'

    id = db.Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    post_id = db.Column(UUIDType(binary=False), db.ForeignKey('posts.id'), nullable=False)
    author_id = db.Column(UUIDType(binary=False), db.ForeignKey('users.id'), nullable=True) # Can be null for guest comments
    author_name = db.Column(db.String(100), nullable=True) # For guest comments
    author_email = db.Column(db.String(120), nullable=True) # For guest comments
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False) # pending, approved, spam
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    post = db.relationship('Post', back_populates='comments')
    author = db.relationship('User', foreign_keys=[author_id], backref='comments')

    def __init__(self, post_id, content, author_id=None, author_name=None, author_email=None, status='pending'):
        self.post_id = post_id
        self.content = content
        self.author_id = author_id
        self.author_name = author_name
        self.author_email = author_email
        self.status = status

    def __repr__(self):
        return f'<Comment {self.id} on Post {self.post_id}>'

class Media(db.Model):
    """
    Media model for uploaded files (images, videos, documents).
    """
    __tablename__ = 'media'

    id = db.Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(255), nullable=False, unique=True) # S3 URL or local path
    filetype = db.Column(db.String(50), nullable=False)
    filesize = db.Column(db.BigInteger, nullable=True)
    title = db.Column(db.String(255), nullable=True)
    alt_text = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    uploader_id = db.Column(UUIDType(binary=False), db.ForeignKey('users.id'), nullable=False)

    # Relationships
    uploader = db.relationship('User', back_populates='media_items')
    posts = db.relationship('Post', secondary='post_media', back_populates='media_items', lazy='dynamic')

    def __init__(self, filename, filepath, filetype, uploader_id, filesize=None, title=None, alt_text=None, description=None):
        self.filename = filename
        self.filepath = filepath
        self.filetype = filetype
        self.uploader_id = uploader_id
        self.filesize = filesize
        self.title = title
        self.alt_text = alt_text
        self.description = description

    def __repr__(self):
        return f'<Media {self.filename}>'

# Association table for many-to-many relationship between Post and Media
post_media = db.Table(
    'post_media',
    db.Column('post_id', UUIDType(binary=False), db.ForeignKey('posts.id'), primary_key=True),
    db.Column('media_id', UUIDType(binary=False), db.ForeignKey('media.id'), primary_key=True)
)

# Blocklisted tokens for JWT revocation
class TokenBlocklist(db.Model):
    """
    Model to store revoked JWT tokens.
    """
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True) # JWT ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<TokenBlocklist {self.jti}>'
```