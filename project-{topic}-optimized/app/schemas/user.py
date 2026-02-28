from app.extensions import ma
from marshmallow import fields
from marshmallow_enum import EnumField
from app.models.user import UserRole # Import UserRole directly

class UserRoleSchema(ma.SQLAlchemySchema):
    class Meta:
        model = UserRole
        load_instance = True
        ordered = True

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    description = fields.Str(allow_none=True)


class UserSchema(ma.SQLAlchemySchema):
    class Meta:
        model = User
        load_instance = True
        ordered = True

    id = fields.Int(dump_only=True)
    username = fields.Str(required=True)
    email = fields.Email(required=True)
    password = fields.Str(load_only=True, required=True, data_key="password") # For creating/updating
    is_active = fields.Bool(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Nested roles schema
    roles = fields.List(fields.Nested(UserRoleSchema), dump_only=True)


class UserRegisterSchema(ma.Schema):
    username = fields.Str(required=True)
    email = fields.Email(required=True)
    password = fields.Str(required=True)

class UserLoginSchema(ma.Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)