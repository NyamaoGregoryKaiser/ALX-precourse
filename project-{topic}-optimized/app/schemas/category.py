from app.extensions import ma
from marshmallow import fields

class CategorySchema(ma.SQLAlchemySchema):
    class Meta:
        model = Category  # Import Category from app.models.category
        load_instance = True
        ordered = True

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    slug = fields.Str(dump_only=True) # Slug is typically generated
    description = fields.Str(allow_none=True)
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # products will not be nested by default to avoid circular dependencies or overly large payloads.
    # We'd fetch products for a category via a separate endpoint.