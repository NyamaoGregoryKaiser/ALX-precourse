```python
import datetime
from app.extensions import db

class MediaType(db.Model):
    """
    Represents a media type (e.g., 'image', 'video', 'document').
    """
    __tablename__ = 'media_types'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # e.g., 'image', 'video', 'document'
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False)

    media_items = db.relationship('Media', backref='media_type', lazy=True)

    def __repr__(self):
        return f'<MediaType {self.name}>'

class Media(db.Model):
    """
    Represents a media item (image, video, document) uploaded to the CMS.
    """
    __tablename__ = 'media'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(255), unique=True, nullable=False) # Full path or URL to the file
    alt_text = db.Column(db.String(255), nullable=True)
    caption = db.Column(db.Text, nullable=True)
    filesize = db.Column(db.Integer, nullable=True) # Size in bytes
    width = db.Column(db.Integer, nullable=True) # For images/videos
    height = db.Column(db.Integer, nullable=True) # For images/videos
    created_at = db.Column(db.DateTime, default=datetime.datetime.now, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False)

    # Foreign Keys
    uploader_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    media_type_id = db.Column(db.Integer, db.ForeignKey('media_types.id'), nullable=False)

    # Many-to-Many relationship with Posts
    from app.models.post import post_media # Import here to avoid circular dependency
    posts = db.relationship('Post', secondary=post_media, back_populates='media_assets')

    def __init__(self, filename, filepath, uploader_id, media_type_id, alt_text=None, caption=None, filesize=None, width=None, height=None):
        self.filename = filename
        self.filepath = filepath
        self.uploader_id = uploader_id
        self.media_type_id = media_type_id
        self.alt_text = alt_text
        self.caption = caption
        self.filesize = filesize
        self.width = width
        self.height = height

    def __repr__(self):
        return f'<Media {self.filename}>'

```