from datetime import datetime
from slugify import slugify
from sqlalchemy.orm import validates
from app.extensions import db, bcrypt

# --- Association Tables ---
content_tags = db.Table(
    'content_tags',
    db.Column('content_id', db.Integer, db.ForeignKey('content.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

# --- User Model ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    role = db.Column(db.String(20), default='author', nullable=False) # admin, editor, author

    # Relationships
    contents = db.relationship('Content', backref='author', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    @validates('email')
    def validate_email(self, key, email):
        if not email or '@' not in email:
            raise ValueError("Email must be valid.")
        return email

    @validates('username')
    def validate_username(self, key, username):
        if not username or len(username) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        return username

    @validates('role')
    def validate_role(self, key, role):
        valid_roles = ['admin', 'editor', 'author']
        if role not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of {', '.join(valid_roles)}.")
        return role

    def __repr__(self):
        return f'<User {self.username}>'

# --- Content Model ---
class Content(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='draft', nullable=False) # draft, published, archived
    is_featured = db.Column(db.Boolean, default=False)
    published_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)

    # Relationships
    category = db.relationship('Category', backref=db.backref('contents', lazy='dynamic'))
    tags = db.relationship('Tag', secondary=content_tags, backref=db.backref('contents', lazy='dynamic'))

    @validates('title')
    def generate_slug(self, key, title):
        if not title:
            raise ValueError("Content title cannot be empty.")
        # Auto-generate slug if not explicitly set
        self.slug = slugify(title)
        return title

    @validates('status')
    def validate_status(self, key, status):
        valid_statuses = ['draft', 'published', 'archived']
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of {', '.join(valid_statuses)}.")
        return status

    def publish(self):
        self.status = 'published'
        self.published_at = datetime.utcnow()

    def unpublish(self):
        self.status = 'draft'
        self.published_at = None

    def __repr__(self):
        return f'<Content {self.title}>'

# --- Category Model ---
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    slug = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @validates('name')
    def generate_slug(self, key, name):
        if not name:
            raise ValueError("Category name cannot be empty.")
        self.slug = slugify(name)
        return name

    def __repr__(self):
        return f'<Category {self.name}>'

# --- Tag Model ---
class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    slug = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @validates('name')
    def generate_slug(self, key, name):
        if not name:
            raise ValueError("Tag name cannot be empty.")
        self.slug = slugify(name)
        return name

    def __repr__(self):
        return f'<Tag {self.name}>'
```