from flask import request
from flask_restx import Namespace, Resource, fields
from app.extensions import db, cache
from app.models import Visualization, DataSource
from app.schemas import visualization_schema, VisualizationSchema, VisualizationConfigSchema, VisualizationQuerySchema
from app.utils.auth_decorators import jwt_required_with_identity, owns_resource_or_admin
from app.errors import BadRequestError, NotFoundError, ConflictError, InternalServerError, ForbiddenError
from app.services.visualization_service import visualization_service
import logging

log = logging.getLogger(__name__)

visualizations_ns = Namespace('visualizations', description='Operations related to visualizations')

# Define request/response models for Flask-RESTX documentation
viz_config_model = visualizations_ns.model('VisualizationConfig', VisualizationConfigSchema().as_dict())
viz_query_model = visualizations_ns.model('VisualizationQuery', VisualizationQuerySchema().as_dict())
visualization_model = visualizations_ns.model('Visualization', {
    'id': fields.Integer(readOnly=True, description='The unique identifier of the visualization'),
    'name': fields.String(required=True, description='The name of the visualization'),
    'description': fields.String(description='A brief description of the visualization'),
    'type': fields.String(required=True, enum=['bar', 'line', 'pie', 'scatter', 'table', 'raw_data'], description='The type of visualization'),
    'config_json': fields.Nested(viz_config_model, required=True, description='JSON configuration for the visualization'),
    'query_json': fields.Nested(viz_query_model, description='JSON defining data query and transformations'),
    'data_source_id': fields.Integer(required=True, description='The ID of the associated data source'),
    'user_id': fields.Integer(readOnly=True, description='The ID of the user who created the visualization'),
    'created_at': fields.DateTime(readOnly=True, description='Timestamp when the visualization was created'),
    'updated_at': fields.DateTime(readOnly=True, description='Timestamp when the visualization was last updated')
})

visualization_data_model = visualizations_ns.model('VisualizationData', {
    'data': fields.Raw(description='The processed data formatted for visualization')
})

@visualizations_ns.route('/')
class VisualizationList(Resource):
    @jwt_required_with_identity()
    @visualizations_ns.marshal_list_with(visualization_model)
    @visualizations_ns.response(401, 'Unauthorized')
    @visualizations_ns.response(500, 'Internal Server Error')
    def get(self, current_user):
        """Retrieve a list of all visualizations owned by the authenticated user."""
        log.info(f"Fetching visualizations for user ID: {current_user.id}")
        return current_user.visualizations, 200

    @jwt_required_with_identity()
    @visualizations_ns.expect(visualization_model, validate=True)
    @visualizations_ns.marshal_with(visualization_model, code=201)
    @visualizations_ns.response(400, 'Validation Error')
    @visualizations_ns.response(401, 'Unauthorized')
    @visualizations_ns.response(404, 'Data Source Not Found')
    @visualizations_ns.response(409, 'Conflict (name already exists)')
    @visualizations_ns.response(500, 'Internal Server Error')
    def post(self, current_user):
        """Create a new visualization."""
        data = request.json
        try:
            viz_data = visualization_schema.load(data)
        except Exception as e:
            log.warning(f"Visualization creation validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Verify data source exists and belongs to the user
        data_source = DataSource.query.get(viz_data['data_source_id'])
        if not data_source:
            raise NotFoundError(f"Data source with ID {viz_data['data_source_id']} not found.")
        if data_source.user_id != current_user.id:
            raise ForbiddenError("You do not have access to the specified data source.")

        # Check for unique name for this user
        if Visualization.query.filter_by(user_id=current_user.id, name=viz_data['name']).first():
            raise ConflictError(f"A visualization named '{viz_data['name']}' already exists for this user.")

        visualization = Visualization(**viz_data, creator=current_user)
        db.session.add(visualization)
        db.session.commit()
        log.info(f"Visualization '{visualization.name}' (ID: {visualization.id}) created by user ID: {current_user.id}.")
        return visualization, 201

@visualizations_ns.route('/<int:viz_id>')
@visualizations_ns.param('viz_id', 'The Visualization identifier')
class VisualizationResource(Resource):
    @jwt_required_with_identity()
    @owns_resource_or_admin(Visualization, id_param_name='viz_id')
    @visualizations_ns.marshal_with(visualization_model)
    @visualizations_ns.response(401, 'Unauthorized')
    @visualizations_ns.response(403, 'Forbidden (not owner or admin)')
    @visualizations_ns.response(404, 'Visualization Not Found')
    @visualizations_ns.response(500, 'Internal Server Error')
    def get(self, current_user, viz_id):
        """Retrieve a single visualization by ID."""
        visualization = Visualization.query.get_or_404(viz_id)
        log.info(f"Fetching visualization {viz_id} for user ID: {current_user.id}.")
        return visualization, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(Visualization, id_param_name='viz_id')
    @visualizations_ns.expect(visualization_model, validate=True, skip_none=True)
    @visualizations_ns.marshal_with(visualization_model)
    @visualizations_ns.response(400, 'Validation Error')
    @visualizations_ns.response(401, 'Unauthorized')
    @visualizations_ns.response(403, 'Forbidden (not owner or admin)')
    @visualizations_ns.response(404, 'Visualization Not Found')
    @visualizations_ns.response(409, 'Conflict (name already exists)')
    @visualizations_ns.response(500, 'Internal Server Error')
    def put(self, current_user, viz_id):
        """Update an existing visualization."""
        visualization = Visualization.query.get_or_404(viz_id)
        data = request.json
        try:
            updated_data = visualization_schema.load(data, partial=True)
        except Exception as e:
            log.warning(f"Visualization update validation error for ID {viz_id}: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check for unique name if name is updated
        if 'name' in updated_data and updated_data['name'] != visualization.name:
            if Visualization.query.filter(
                Visualization.user_id == current_user.id,
                Visualization.name == updated_data['name'],
                Visualization.id != viz_id
            ).first():
                raise ConflictError(f"A visualization named '{updated_data['name']}' already exists for this user.")

        # If data_source_id is updated, verify new data source
        if 'data_source_id' in updated_data and updated_data['data_source_id'] != visualization.data_source_id:
            new_data_source = DataSource.query.get(updated_data['data_source_id'])
            if not new_data_source:
                raise NotFoundError(f"New data source with ID {updated_data['data_source_id']} not found.")
            if new_data_source.user_id != current_user.id:
                raise ForbiddenError("You do not have access to the new specified data source.")

        for key, value in updated_data.items():
            setattr(visualization, key, value)

        db.session.commit()
        log.info(f"Visualization {viz_id} updated by user ID: {current_user.id}.")
        # Clear cache for this visualization on update
        cache.delete_memoized(visualization_service.get_processed_visualization_data, viz_id, current_user.id)
        return visualization, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(Visualization, id_param_name='viz_id')
    @visualizations_ns.response(204, 'Visualization deleted successfully')
    @visualizations_ns.response(401, 'Unauthorized')
    @visualizations_ns.response(403, 'Forbidden (not owner or admin)')
    @visualizations_ns.response(404, 'Visualization Not Found')
    @visualizations_ns.response(500, 'Internal Server Error')
    def delete(self, current_user, viz_id):
        """Delete an existing visualization."""
        visualization = Visualization.query.get_or_404(viz_id)
        db.session.delete(visualization)
        db.session.commit()
        log.info(f"Visualization {viz_id} deleted by user ID: {current_user.id}.")
        # Clear cache for this visualization on delete
        cache.delete_memoized(visualization_service.get_processed_visualization_data, viz_id, current_user.id)
        return '', 204

@visualizations_ns.route('/<int:viz_id>/data')
@visualizations_ns.param('viz_id', 'The Visualization identifier')
class VisualizationDataResource(Resource):
    @jwt_required_with_identity()
    @visualizations_ns.marshal_with(visualization_data_model)
    @visualizations_ns.response(200, 'Processed data for the visualization')
    @visualizations_ns.response(401, 'Unauthorized')
    @visualizations_ns.response(403, 'Forbidden (not owner or admin of viz or data source)')
    @visualizations_ns.response(404, 'Visualization or Data Source Not Found')
    @visualizations_ns.response(500, 'Internal Server Error')
    def get(self, current_user, viz_id):
        """Retrieve the processed data for a visualization."""
        # The authorization for data access is handled within visualization_service.get_processed_visualization_data
        log.info(f"Requesting data for visualization {viz_id} by user ID: {current_user.id}.")
        data = visualization_service.get_processed_visualization_data(viz_id, current_user.id)
        return {'data': data}, 200