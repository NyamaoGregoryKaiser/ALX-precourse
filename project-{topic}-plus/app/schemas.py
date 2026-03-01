```python
from marshmallow import Schema, fields, validate
from app.models import UserRole, OrderStatus
import uuid

class UUIDField(fields.Field):
    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return None
        return str(value)

    def _deserialize(self, value, attr, data, **kwargs):
        if not value:
            return None
        try:
            return uuid.UUID(value)
        except ValueError:
            raise validate.ValidationError("Invalid UUID format.")

class UserSchema(Schema):
    id = UUIDField(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    role = fields.Enum(UserRole, dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserRegisterSchema(UserSchema):
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=6))
    role = fields.Enum(UserRole, load_only=True, default=UserRole.CUSTOMER, missing=UserRole.CUSTOMER)

class CategorySchema(Schema):
    id = UUIDField(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    slug = fields.Str(dump_only=True)
    description = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class ProductSchema(Schema):
    id = UUIDField(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=255))
    slug = fields.Str(dump_only=True)
    description = fields.Str()
    price = fields.Decimal(required=True, places=2, as_string=True, validate=validate.Range(min=0.01))
    stock = fields.Int(required=True, validate=validate.Range(min=0))
    image_url = fields.Url()
    category_id = UUIDField(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    category = fields.Nested(CategorySchema, dump_only=True, exclude=('description', 'products')) # Show nested category info

class CartItemProductSchema(ProductSchema):
    class Meta:
        fields = ('id', 'name', 'slug', 'price', 'image_url') # Only show essential product info

class CartItemSchema(Schema):
    id = UUIDField(dump_only=True)
    product_id = UUIDField(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    product = fields.Nested(CartItemProductSchema, dump_only=True) # Nested product details

class CartSchema(Schema):
    id = UUIDField(dump_only=True)
    user_id = UUIDField(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    items = fields.List(fields.Nested(CartItemSchema), dump_only=True)

class OrderItemProductSchema(ProductSchema):
    class Meta:
        fields = ('id', 'name', 'slug', 'image_url') # Only show essential product info

class OrderItemSchema(Schema):
    id = UUIDField(dump_only=True)
    product_id = UUIDField(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    price = fields.Decimal(required=True, places=2, as_string=True, validate=validate.Range(min=0.01)) # Price at time of order
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    product = fields.Nested(OrderItemProductSchema, dump_only=True)

class OrderSchema(Schema):
    id = UUIDField(dump_only=True)
    user_id = UUIDField(dump_only=True)
    total_amount = fields.Decimal(dump_only=True, places=2, as_string=True)
    status = fields.Enum(OrderStatus, dump_only=True)
    shipping_address = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    items = fields.List(fields.Nested(OrderItemSchema), dump_only=True)
    
class OrderUpdateSchema(Schema):
    status = fields.Enum(OrderStatus, required=True)
```