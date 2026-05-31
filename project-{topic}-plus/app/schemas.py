from marshmallow import Schema, fields, validate, post_load
from app.models import User, DataSource, Visualization, Dashboard, DashboardVisualization
from app.extensions import db
import logging

log = logging.getLogger(__name__)

# --- User Schemas ---
class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=64))
    email = fields.Email(required=True, validate=validate.Length(max=120))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserRegisterSchema(UserSchema):
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=6))

    @post_load
    def make_user(self, data, **kwargs):
        user = User(username=data['username'], email=data['email'])
        user.set_password(data['password'])
        return user

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)

# --- DataSource Schemas ---
class DataSourceSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=128))
    description = fields.Str(allow_none=True, validate=validate.Length(max=512))
    type = fields.Str(required=True, validate=validate.OneOf(['CSV', 'Excel', 'PostgreSQL', 'MySQL', 'API']))
    connection_string = fields.Str(allow_none=True)
    file_path = fields.Str(allow_none=True, dump_only=True) # Managed by backend on upload
    schema_json = fields.Dict(allow_none=True)

    user_id = fields.Int(dump_only=True) # Creator ID
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class DataSourceUploadSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=3, max=128))
    description = fields.Str(allow_none=True, validate=validate.Length(max=512))
    # File field is handled by Flask-RESTX directly for file uploads

# --- Visualization Schemas ---
class VisualizationConfigSchema(Schema):
    chart_type = fields.Str(required=True, validate=validate.OneOf(['bar', 'line', 'pie', 'scatter', 'table']))
    x_axis = fields.Str(allow_none=True)
    y_axis = fields.Str(allow_none=True)
    color_by = fields.Str(allow_none=True)
    title = fields.Str(allow_none=True)
    # Add more specific chart config fields as needed

class VisualizationQuerySchema(Schema):
    columns = fields.List(fields.Str(), allow_none=True) # Columns to select
    filters = fields.Dict(allow_none=True) # e.g., {"column_name": {"operator": "value"}}
    group_by = fields.List(fields.Str(), allow_none=True)
    aggregate = fields.Dict(allow_none=True) # e.g., {"column_name": "sum"}
    sort_by = fields.List(fields.Dict(keys=fields.Str(), values=fields.Str()), allow_none=True) # e.g., [{"column": "col1", "order": "asc"}]
    limit = fields.Int(allow_none=True, validate=validate.Range(min=1))

class VisualizationSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=128))
    description = fields.Str(allow_none=True, validate=validate.Length(max=512))
    type = fields.Str(required=True, validate=validate.OneOf(['bar', 'line', 'pie', 'scatter', 'table', 'raw_data']))
    config_json = fields.Nested(VisualizationConfigSchema, required=True)
    query_json = fields.Nested(VisualizationQuerySchema, allow_none=True)

    data_source_id = fields.Int(required=True)
    user_id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

# --- Dashboard Visualization Association Schemas ---
class DashboardVisualizationSchema(Schema):
    visualization_id = fields.Int(required=True)
    position_x = fields.Int(required=True)
    position_y = fields.Int(required=True)
    width = fields.Int(required=True, validate=validate.Range(min=1))
    height = fields.Int(required=True, validate=validate.Range(min=1))
    created_at = fields.DateTime(dump_only=True)

# Schema for dumping a visualization *within* a dashboard context
class DashboardVizDetailSchema(DashboardVisualizationSchema):
    visualization = fields.Nested(VisualizationSchema, dump_only=True) # Include full viz details

# --- Dashboard Schemas ---
class DashboardSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=128))
    description = fields.Str(allow_none=True, validate=validate.Length(max=512))
    layout_json = fields.Dict(allow_none=True) # For general grid layout config

    user_id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class DashboardDetailSchema(DashboardSchema):
    # This will be populated by the API when fetching a single dashboard
    visualizations = fields.List(fields.Nested(DashboardVizDetailSchema), dump_only=True)

# Initializing schemas for reuse
user_schema = UserSchema()
user_register_schema = UserRegisterSchema()
user_login_schema = UserLoginSchema()
data_source_schema = DataSourceSchema()
data_source_upload_schema = DataSourceUploadSchema()
visualization_schema = VisualizationSchema()
dashboard_schema = DashboardSchema()
dashboard_detail_schema = DashboardDetailSchema()
dashboard_viz_schema = DashboardVisualizationSchema()