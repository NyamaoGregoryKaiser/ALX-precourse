```python
from app.extensions import ma
from app.models.post import Post, PostStatus
from app.schemas.user import UserSchema # Import user schema for nesting
from app.schemas.category import CategorySchema # Import category schema for nesting
from app.schemas.media import MediaSchema # Import media schema for nesting

class PostSchema(ma.SQLAlchemyAutoSchema):
    """
    Marshmallow schema for Post model.
    Includes nested schemas for author, category, and media assets.
    """
    class Meta:
        model = Post
        load_instance = True
        include_fk = True # Include foreign keys like author_id, category_id
        fields = (
            'id', 'title', 'slug', 'content', 'summary', 'status',
            'featured_image_url', 'created_at', 'updated_at', 'published_at',
            'author_id', 'category_id', 'author', 'category', 'media_assets'
        )
        dump_only = ('id', 'created_at', 'updated_at', 'published_at')

    # Nested schema for author
    author = ma.Nested(UserSchema, only=('id', 'username', 'email'), dump_only=True)
    # Nested schema for category
    category = ma.Nested(CategorySchema, only=('id', 'name', 'slug'), dump_only=True)
    # Nested schema for media assets (many-to-many)
    media_assets = ma.Nested(MediaSchema, many=True, only=('id', 'filename', 'filepath', 'alt_text'), dump_only=True)

    # Custom field for status to ensure it's handled as a string
    status = ma.Function(lambda obj: obj.status.value if obj.status else None, deserialize=lambda value: PostStatus(value) if value else None)

# Initialize schemas
post_schema = PostSchema()
posts_schema = PostSchema(many=True)
```