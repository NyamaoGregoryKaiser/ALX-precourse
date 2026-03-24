from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from app.models import User, Content, Category, Tag
from app.extensions import ma

# --- Helper Schemas (for embedding) ---
class UserSchemaNested(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role')

class CategorySchemaNested(SQLAlchemyAutoSchema):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug')

class TagSchemaNested(SQLAlchemyAutoSchema):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'slug')

# --- Main Schemas ---

class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True # Include foreign keys for relationships

    # Fields for input validation (load_only) and output (dump_only)
    password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=6, max=100, error="Password must be between 6 and 100 characters.")
    )
    email = fields.Email(required=True)
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    role = fields.String(
        validate=validate.OneOf(['admin', 'editor', 'author']),
        load_default='author',
        dump_default='author'
    )
    is_active = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class ContentSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Content
        load_instance = True
        include_fk = True

    # Nested relationships for output
    author = fields.Nested(UserSchemaNested, dump_only=True)
    category = fields.Nested(CategorySchemaNested, dump_only=True)
    tags = fields.Nested(TagSchemaNested, many=True, dump_only=True)

    # Input fields
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    slug = fields.String(dump_only=True) # Slug is auto-generated
    body = fields.String(required=True, validate=validate.Length(min=1))
    status = fields.String(
        validate=validate.OneOf(['draft', 'published', 'archived']),
        load_default='draft',
        dump_default='draft'
    )
    is_featured = fields.Boolean(load_default=False, dump_default=False)
    published_at = fields.DateTime(dump_only=True)
    user_id = fields.Integer(required=True, validate=validate.Range(min=1)) # Author ID
    category_id = fields.Integer(allow_none=True, validate=validate.Range(min=1))
    tag_ids = fields.List(fields.Integer(), load_only=True, missing=[]) # For setting tags by ID

    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class CategorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Category
        load_instance = True

    name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    slug = fields.String(dump_only=True) # Slug is auto-generated
    description = fields.String(allow_none=True, validate=validate.Length(max=500))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class TagSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Tag
        load_instance = True

    name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    slug = fields.String(dump_only=True) # Slug is auto-generated
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

# --- Authentication Schemas ---
class UserRegisterSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6, max=100))

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)
```