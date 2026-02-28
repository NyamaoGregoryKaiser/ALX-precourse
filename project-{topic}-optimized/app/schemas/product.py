from app.extensions import ma
from marshmallow import fields, validate
from app.models.product import Product
from app.schemas.category import CategorySchema # Nested category info

class ProductSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Product
        load_instance = True
        ordered = True

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=255))
    slug = fields.Str(dump_only=True)
    description = fields.Str(allow_none=True)
    price = fields.Decimal(required=True, as_string=True, places=2, validate=validate.Range(min=0.01))
    stock_quantity = fields.Int(required=True, validate=validate.Range(min=0))
    image_url = fields.URL(allow_none=True)
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # For deserialization (input) - expect category_id
    category_id = fields.Int(required=True, load_only=True)

    # For serialization (output) - nest category details
    category = fields.Nested(CategorySchema, dump_only=True)