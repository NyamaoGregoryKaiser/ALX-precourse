from flask import request
from flask_restx import Namespace, Resource, fields
from werkzeug.datastructures import FileStorage
from app.extensions import db, api
from app.models import DataSource, User
from app.schemas import data_source_schema, DataSourceUploadSchema
from app.utils.auth_decorators import jwt_required_with_identity, owns_resource_or_admin
from app.errors import BadRequestError, NotFoundError, ConflictError, InternalServerError, ForbiddenError
from app.services.data_processing import data_processor
import logging
import os # For simulating file storage path

log = logging.getLogger(__name__)

data_sources_ns = Namespace('data-sources', description='Operations related to data sources')

# Define request/response models for Flask-RESTX documentation
data_source_model = data_sources_ns.model('DataSource', data_source_schema.as_dict())

# Model for file upload
upload_parser = data_sources_ns.parser()
upload_parser.add_argument('file', location='files', type=FileStorage, required=True, help='The data file (CSV, Excel)')
upload_parser.add_argument('name', type=str, required=True, help='Name for the data source')
upload_parser.add_argument('description', type=str, help='Description for the data source')

@data_sources_ns.route('/')
class DataSourceList(Resource):
    @jwt_required_with_identity()
    @data_sources_ns.marshal_list_with(data_source_model)
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(500, 'Internal Server Error')
    def get(self, current_user):
        """Retrieve a list of all data sources owned by the authenticated user."""
        log.info(f"Fetching data sources for user ID: {current_user.id}")
        return current_user.data_sources, 200

    @jwt_required_with_identity()
    @data_sources_ns.expect(data_source_model, validate=True)
    @data_sources_ns.marshal_with(data_source_model, code=201)
    @data_sources_ns.response(400, 'Validation Error')
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(409, 'Conflict (name already exists)')
    @data_sources_ns.response(500, 'Internal Server Error')
    def post(self, current_user):
        """Create a new data source (for DB/API type, not file upload)."""
        data = request.json
        try:
            # Validate and load data (excluding file_path which is dump_only)
            source_data = data_source_schema.load(data)
        except Exception as e:
            log.warning(f"Data source creation validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check for unique name for this user
        if DataSource.query.filter_by(user_id=current_user.id, name=source_data.name).first():
            raise ConflictError(f"A data source named '{source_data.name}' already exists for this user.")

        # Ensure that file-based types are not created via this endpoint
        if source_data.type in ['CSV', 'Excel']:
            raise BadRequestError(f"Use the '/upload' endpoint for file-based data sources.")

        data_source = DataSource(**source_data, owner=current_user)
        db.session.add(data_source)
        db.session.commit()
        log.info(f"Data source '{data_source.name}' (ID: {data_source.id}) created by user ID: {current_user.id}.")
        return data_source, 201

@data_sources_ns.route('/upload')
class DataSourceUpload(Resource):
    @jwt_required_with_identity()
    @data_sources_ns.expect(upload_parser, validate=True)
    @data_sources_ns.marshal_with(data_source_model, code=201)
    @data_sources_ns.response(400, 'Validation Error or Invalid File')
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(409, 'Conflict (name already exists)')
    @data_sources_ns.response(413, 'File Too Large')
    @data_sources_ns.response(500, 'Internal Server Error')
    def post(self, current_user):
        """Upload a file (CSV/Excel) to create a new data source."""
        args = upload_parser.parse_args()
        file_storage = args['file']
        name = args['name']
        description = args['description']

        if not file_storage:
            raise BadRequestError("No file provided.")

        # Check file size (configured in app.config['MAX_FILE_SIZE'])
        max_file_size = api.app.config.get('MAX_FILE_SIZE')
        if max_file_size and file_storage.content_length > max_file_size:
            raise BadRequestError(f"File too large. Maximum size is {max_file_size / (1024 * 1024)} MB.")

        # Determine file type
        file_type = data_processor._get_file_type_from_filename(file_storage.filename)
        if not file_type:
            file_type = data_processor._get_file_type_from_mimetype(file_storage.mimetype)

        if not file_type or file_type not in ['csv', 'excel']:
            raise BadRequestError("Unsupported file type. Only CSV and Excel files are allowed.")

        # Check for unique name for this user
        if DataSource.query.filter_by(user_id=current_user.id, name=name).first():
            raise ConflictError(f"A data source named '{name}' already exists for this user.")

        try:
            # Load and parse file into DataFrame
            df = data_processor.load_file_data(file_storage, file_type)

            if df.empty:
                raise BadRequestError("Uploaded file is empty or contains no data.")

            # Detect schema
            schema_json = data_processor.detect_schema(df)

            # In a real application, you would save the file to a persistent storage (S3, local disk)
            # and store its path. For this example, we'll just store a mock path.
            mock_file_path = f"data_uploads/{current_user.id}/{name}.{file_type}"
            log.info(f"Simulating file save to: {mock_file_path}")
            # Ensure the directory exists if actually saving
            # os.makedirs(os.path.dirname(mock_file_path), exist_ok=True)
            # df.to_csv(mock_file_path, index=False) # Or to_excel

            data_source = DataSource(
                name=name,
                description=description,
                type=file_type.upper(), # Store as uppercase
                file_path=mock_file_path, # Store the mock path
                schema_json=schema_json,
                owner=current_user
            )
            db.session.add(data_source)
            db.session.commit()
            log.info(f"File-based data source '{data_source.name}' (ID: {data_source.id}) uploaded by user ID: {current_user.id}.")
            return data_source, 201
        except BadRequestError as e:
            raise e
        except Exception as e:
            log.error(f"Error processing uploaded data source: {e}", exc_info=True)
            raise InternalServerError("Failed to process the uploaded data source.")


@data_sources_ns.route('/<int:source_id>')
@data_sources_ns.param('source_id', 'The Data Source identifier')
class DataSourceResource(Resource):
    @jwt_required_with_identity()
    @owns_resource_or_admin(DataSource, id_param_name='source_id')
    @data_sources_ns.marshal_with(data_source_model)
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(403, 'Forbidden (not owner or admin)')
    @data_sources_ns.response(404, 'Data Source Not Found')
    @data_sources_ns.response(500, 'Internal Server Error')
    def get(self, current_user, source_id):
        """Retrieve a single data source by ID."""
        data_source = DataSource.query.get_or_404(source_id)
        log.info(f"Fetching data source {source_id} for user ID: {current_user.id}.")
        return data_source, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(DataSource, id_param_name='source_id')
    @data_sources_ns.expect(data_source_model, validate=True, skip_none=True)
    @data_sources_ns.marshal_with(data_source_model)
    @data_sources_ns.response(400, 'Validation Error')
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(403, 'Forbidden (not owner or admin)')
    @data_sources_ns.response(404, 'Data Source Not Found')
    @data_sources_ns.response(409, 'Conflict (name already exists)')
    @data_sources_ns.response(500, 'Internal Server Error')
    def put(self, current_user, source_id):
        """Update an existing data source."""
        data_source = DataSource.query.get_or_404(source_id)
        data = request.json
        try:
            # Load with partial=True to allow missing required fields for updates
            updated_data = data_source_schema.load(data, partial=True)
        except Exception as e:
            log.warning(f"Data source update validation error for ID {source_id}: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check for unique name if name is updated
        if 'name' in updated_data and updated_data['name'] != data_source.name:
            if DataSource.query.filter(
                DataSource.user_id == current_user.id,
                DataSource.name == updated_data['name'],
                DataSource.id != source_id
            ).first():
                raise ConflictError(f"A data source named '{updated_data['name']}' already exists for this user.")

        # Prevent updating file_path or type via this endpoint
        if 'file_path' in updated_data or 'type' in updated_data:
            raise BadRequestError("File path and type cannot be updated directly.")

        for key, value in updated_data.items():
            setattr(data_source, key, value)

        db.session.commit()
        log.info(f"Data source {source_id} updated by user ID: {current_user.id}.")
        return data_source, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(DataSource, id_param_name='source_id')
    @data_sources_ns.response(204, 'Data Source deleted successfully')
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(403, 'Forbidden (not owner or admin)')
    @data_sources_ns.response(404, 'Data Source Not Found')
    @data_sources_ns.response(500, 'Internal Server Error')
    def delete(self, current_user, source_id):
        """Delete an existing data source."""
        data_source = DataSource.query.get_or_404(source_id)

        # In a real app, if it's a file-based source, delete the actual file
        # if data_source.file_path and os.path.exists(data_source.file_path):
        #     os.remove(data_source.file_path)
        #     log.info(f"Deleted physical file: {data_source.file_path}")

        db.session.delete(data_source)
        db.session.commit()
        log.info(f"Data source {source_id} deleted by user ID: {current_user.id}.")
        return '', 204

@data_sources_ns.route('/<int:source_id>/schema')
@data_sources_ns.param('source_id', 'The Data Source identifier')
class DataSourceSchemaResource(Resource):
    @jwt_required_with_identity()
    @owns_resource_or_admin(DataSource, id_param_name='source_id')
    @data_sources_ns.response(200, 'Data Source schema')
    @data_sources_ns.response(401, 'Unauthorized')
    @data_sources_ns.response(403, 'Forbidden (not owner or admin)')
    @data_sources_ns.response(404, 'Data Source Not Found')
    @data_sources_ns.response(500, 'Internal Server Error')
    def get(self, current_user, source_id):
        """Retrieve the detected schema for a data source."""
        data_source = DataSource.query.get_or_404(source_id)
        if not data_source.schema_json:
            log.warning(f"No schema found for data source {source_id}.")
            return {"message": "No schema information available for this data source."}, 200
        return data_source.schema_json, 200