from marshmallow import Schema, fields, validate
from app.models import Role, TaskStatus
from webargs.flaskparser import use_args, use_kwargs
from functools import wraps

class AuthSchema(Schema):
    """Schema for user authentication (login/register)."""
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True, validate=validate.Length(min=5, max=120))
    password = fields.Str(required=True, validate=validate.Length(min=6))

class UserUpdateSchema(Schema):
    """Schema for updating user details."""
    username = fields.Str(validate=validate.Length(min=3, max=80))
    email = fields.Email(validate=validate.Length(min=5, max=120))
    # Role update should typically be restricted to admin via authorization, not directly via schema validation
    role = fields.Enum(Role, by_value=True, missing=Role.USER) # Allow setting role

class TaskSchema(Schema):
    """Schema for creating/updating a task."""
    title = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    status = fields.Enum(TaskStatus, by_value=True, missing=TaskStatus.PENDING)
    due_date = fields.DateTime(format="iso", allow_none=True)
    assigned_to_id = fields.Int(allow_none=True) # ID of the user assigned to the task

class TaskUpdateSchema(Schema):
    """Schema for updating an existing task."""
    title = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str(validate=validate.Length(max=500), allow_none=True)
    status = fields.Enum(TaskStatus, by_value=True)
    due_date = fields.DateTime(format="iso", allow_none=True)
    assigned_to_id = fields.Int(allow_none=True)

class TaskQuerySchema(Schema):
    """Schema for querying tasks."""
    status = fields.Enum(TaskStatus, by_value=True)
    created_by_id = fields.Int()
    assigned_to_id = fields.Int()
    due_date_before = fields.DateTime(format="iso")
    due_date_after = fields.DateTime(format="iso")
    page = fields.Int(missing=1, validate=validate.Range(min=1))
    per_page = fields.Int(missing=10, validate=validate.Range(min=1, max=100))


# Decorators for schema validation
def validate_json_body(schema_class):
    """Decorator to validate JSON request body using Marshmallow schema."""
    def decorator(f):
        @wraps(f)
        @use_args(schema_class(), location="json")
        def wrapped_function(args, *kwargs):
            return f(*args, **kwargs)
        return wrapped_function
    return decorator

def validate_query_params(schema_class):
    """Decorator to validate query parameters using Marshmallow schema."""
    def decorator(f):
        @wraps(f)
        @use_kwargs(schema_class(), location="query")
        def wrapped_function(*args, **kwargs):
            return f(*args, **kwargs)
        return wrapped_function
    return decorator
```