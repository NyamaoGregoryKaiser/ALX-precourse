```python
from flask_marshmallow import Marshmallow
from marshmallow import fields, validate
from app.extensions import db
from app.models import User, Post, Category, Tag, Comment, Media

ma = Marshmallow()

class UserSchema(ma.SQLAlchemyAutoSchema):
    """Marshmallow schema for User model."""
    class Meta:
        model = User
        load_instance = True
        sqla_session = db.session
        # Exclude sensitive fields like password_hash from being serialized
        exclude = ("password_hash",)

    id = fields.UUID(dump_only=True)
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    role = fields.String(validate=validate.OneOf(['admin', 'editor', 'author', 'contributor']))
    is_active = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserRegisterSchema(UserSchema):
    """Schema for user registration, includes password for loading."""
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=8))

    class Meta(UserSchema.Meta):
        exclude = ("password_hash", "is_active", "created_at", "updated_at", "role") # Role set by default in model
        fields = ("id", "username", "email", "password") # Explicitly define fields for registration

class CategorySchema(ma.SQLAlchemyAutoSchema):
    """Marshmallow schema for Category model."""
    class Meta:
        model = Category
        load_instance = True
        sqla_session = db.session

    id = fields.UUID(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=3, max=100))
    slug = fields.String(required=True, validate=validate.Length(min=3, max=100))
    description = fields.String(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class TagSchema(ma.SQLAlchemyAutoSchema):
    """Marshmallow schema for Tag model."""
    class Meta:
        model = Tag
        load_instance = True
        sqla_session = db.session

    id = fields.UUID(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=2, max=50))
    slug = fields.String(required=True, validate=validate.Length(min=2, max=50))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class CommentSchema(ma.SQLAlchemyAutoSchema):
    """Marshmallow schema for Comment model."""
    class Meta:
        model = Comment
        load_instance = True
        sqla_session = db.session
        include_fk = True # Include foreign keys in serialization

    id = fields.UUID(dump_only=True)
    post_id = fields.UUID(required=True)
    author_id = fields.UUID(allow_none=True)
    author_name = fields.String(allow_none=True, validate=validate.Length(max=100))
    author_email = fields.Email(allow_none=True)
    content = fields.String(required=True, validate=validate.Length(min=1))
    status = fields.String(validate=validate.OneOf(['pending', 'approved', 'spam']))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Nested author info (optional, if you want to expose more user data)
    # author = fields.Nested(UserSchema, only=("id", "username", "email"), dump_only=True)

class MediaSchema(ma.SQLAlchemyAutoSchema):
    """Marshmallow schema for Media model."""
    class Meta:
        model = Media
        load_instance = True
        sqla_session = db.session
        include_fk = True

    id = fields.UUID(dump_only=True)
    filename = fields.String(required=True)
    filepath = fields.URL(required=True)
    filetype = fields.String(required=True)
    filesize = fields.Integer(allow_none=True)
    title = fields.String(allow_none=True, validate=validate.Length(max=255))
    alt_text = fields.String(allow_none=True, validate=validate.Length(max=255))
    description = fields.String(allow_none=True)
    uploaded_at = fields.DateTime(dump_only=True)
    uploader_id = fields.UUID(dump_only=True) # Uploader ID is typically set by current_user

    # uploader = fields.Nested(UserSchema, only=("id", "username"), dump_only=True)

class PostSchema(ma.SQLAlchemyAutoSchema):
    """Marshmallow schema for Post model."""
    class Meta:
        model = Post
        load_instance = True
        sqla_session = db.session
        include_fk = True # Include foreign keys

    id = fields.UUID(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=5, max=255))
    slug = fields.String(required=True, validate=validate.Length(min=5, max=255))
    content = fields.String(required=True, validate=validate.Length(min=10))
    excerpt = fields.String(allow_none=True)
    status = fields.String(validate=validate.OneOf(['draft', 'pending', 'published', 'archived']))
    visibility = fields.String(validate=validate.OneOf(['public', 'private', 'password_protected']))
    published_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    author_id = fields.UUID(required=True) # For creation/update
    category_id = fields.UUID(allow_none=True) # For creation/update

    # Nested relationships (dump_only for read operations)
    author = fields.Nested(UserSchema, only=("id", "username", "email"), dump_only=True)
    category = fields.Nested(CategorySchema, only=("id", "name", "slug"), dump_only=True)
    tags = fields.List(fields.Nested(TagSchema, only=("id", "name", "slug")), dump_only=True)
    comments = fields.List(fields.Nested(CommentSchema, only=("id", "content", "author_name", "created_at")), dump_only=True)
    media_items = fields.List(fields.Nested(MediaSchema, only=("id", "filename", "filepath")), dump_only=True)

# Instantiate schemas for use
user_schema = UserSchema()
users_schema = UserSchema(many=True)
user_register_schema = UserRegisterSchema()

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

tag_schema = TagSchema()
tags_schema = TagSchema(many=True)

post_schema = PostSchema()
posts_schema = PostSchema(many=True)

comment_schema = CommentSchema()
comments_schema = CommentSchema(many=True)

media_schema = MediaSchema()
media_items_schema = MediaSchema(many=True)
```