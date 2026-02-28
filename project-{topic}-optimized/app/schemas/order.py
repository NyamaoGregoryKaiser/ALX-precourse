from app.extensions import ma
from marshmallow import fields, validate
from marshmallow_enum import EnumField
from app.models.order import Order, OrderItem, OrderStatus
from app.schemas.product import ProductSchema # For nesting product info

class OrderItemSchema(ma.SQLAlchemySchema):
    class Meta:
        model = OrderItem
        load_instance = True
        ordered = True

    id = fields.Int(dump_only=True)
    product_id = fields.Int(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    price_at_purchase = fields.Decimal(dump_only=True, as_string=True, places=2)

    # Nested product details for output
    product = fields.Nested(ProductSchema, dump_only=True, exclude=("category", "slug"))


class OrderSchema(ma.SQLAlchemySchema):
    class Meta:
        model = Order
        load_instance = True
        ordered = True

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True) # User ID is taken from JWT
    order_date = fields.DateTime(dump_only=True)
    status = EnumField(OrderStatus, dump_only=True, by_value=True) # Status changes by backend
    total_amount = fields.Decimal(dump_only=True, as_string=True, places=2)
    shipping_address = fields.Str(required=True, validate=validate.Length(min=10))
    billing_address = fields.Str(allow_none=True)
    updated_at = fields.DateTime(dump_only=True)

    items = fields.List(fields.Nested(OrderItemSchema), required=True)

    # Exclude user for simplicity or fetch separately
    # customer = fields.Nested(UserSchema, dump_only=True, exclude=('roles', 'password', 'email'))