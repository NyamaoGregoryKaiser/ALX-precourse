```python
from app.extensions import ma
from app.models.user import User, UserRole

class UserSchema(ma.SQLAlchemyAutoSchema):
    """
    Marshmallow schema for User model.
    Used for serializing User objects to JSON and deserializing JSON to User objects.
    """
    class Meta:
        model = User
        load_instance = True # Optional: deserialize to model instances
        include_fk = True # Include foreign keys like author_id if applicable
        # Define fields to expose or hide
        fields = (
            'id', 'username', 'email', 'role', 'is_active',
            'created_at', 'updated_at'
        )
        # Exclude sensitive fields by default
        dump_only = ('id', 'created_at', 'updated_at', 'is_active')

    # Custom field for role to ensure it's handled as a string
    role = ma.Function(lambda obj: obj.role.value if obj.role else None, deserialize=lambda value: UserRole(value) if value else None)

class UserRegisterSchema(ma.Schema):
    """
    Schema for user registration.
    Includes password field for input, which is not dumped.
    """
    username = ma.Str(required=True, unique=True, error_messages={"unique": "Username already exists."})
    email = ma.Email(required=True, unique=True, error_messages={"unique": "Email already exists."})
    password = ma.Str(required=True, load_only=True, validate=lambda s: len(s) >= 8)
    role = ma.Str(
        load_only=True,
        required=False,
        validate=lambda r: r in [e.value for e in UserRole],
        missing=UserRole.USER.value # Default role
    )

class UserLoginSchema(ma.Schema):
    """
    Schema for user login.
    """
    username = ma.Str(required=True)
    password = ma.Str(required=True, load_only=True)

class UserUpdateSchema(ma.SQLAlchemyAutoSchema):
    """
    Schema for updating user information.
    """
    class Meta:
        model = User
        load_instance = True
        # Fields that can be updated
        fields = ('username', 'email', 'role', 'is_active', 'password_hash')
        load_only = ('password_hash',) # Password hash should only be loaded, not dumped
        dump_only = ('id', 'created_at', 'updated_at')

    # Optional: allow role to be updated, but validate against UserRole enum values
    role = ma.Str(
        required=False,
        validate=lambda r: r in [e.value for e in UserRole],
        attribute='role.value', # Map to enum value for dumping
        deserialize=lambda value: UserRole(value) if value else None # Deserialize to enum
    )
    email = ma.Email(required=False, unique=True, error_messages={"unique": "Email already exists."})
    username = ma.Str(required=False, unique=True, error_messages={"unique": "Username already exists."})

    # Add a separate password field for update, only for loading
    new_password = ma.Str(required=False, load_only=True, validate=lambda s: len(s) >= 8)

# Initialize schemas
user_schema = UserSchema()
users_schema = UserSchema(many=True)
user_register_schema = UserRegisterSchema()
user_login_schema = UserLoginSchema()
user_update_schema = UserUpdateSchema()
```