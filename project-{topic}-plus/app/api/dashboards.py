from flask import request
from flask_restx import Namespace, Resource, fields
from app.extensions import db
from app.models import Dashboard, Visualization, DashboardVisualization
from app.schemas import dashboard_schema, dashboard_detail_schema, dashboard_viz_schema, DashboardVisualizationSchema
from app.utils.auth_decorators import jwt_required_with_identity, owns_resource_or_admin
from app.errors import BadRequestError, NotFoundError, ConflictError, InternalServerError, ForbiddenError
import logging

log = logging.getLogger(__name__)

dashboards_ns = Namespace('dashboards', description='Operations related to dashboards')

# Define request/response models for Flask-RESTX documentation
dashboard_model = dashboards_ns.model('Dashboard', dashboard_schema.as_dict())
dashboard_detail_model = dashboards_ns.model('DashboardDetail', dashboard_detail_schema.as_dict())
dashboard_viz_add_model = dashboards_ns.model('DashboardVisualizationAdd', DashboardVisualizationSchema().as_dict())


@dashboards_ns.route('/')
class DashboardList(Resource):
    @jwt_required_with_identity()
    @dashboards_ns.marshal_list_with(dashboard_model)
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(500, 'Internal Server Error')
    def get(self, current_user):
        """Retrieve a list of all dashboards owned by the authenticated user."""
        log.info(f"Fetching dashboards for user ID: {current_user.id}")
        return current_user.dashboards, 200

    @jwt_required_with_identity()
    @dashboards_ns.expect(dashboard_model, validate=True)
    @dashboards_ns.marshal_with(dashboard_model, code=201)
    @dashboards_ns.response(400, 'Validation Error')
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(409, 'Conflict (name already exists)')
    @dashboards_ns.response(500, 'Internal Server Error')
    def post(self, current_user):
        """Create a new dashboard."""
        data = request.json
        try:
            dash_data = dashboard_schema.load(data)
        except Exception as e:
            log.warning(f"Dashboard creation validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check for unique name for this user
        if Dashboard.query.filter_by(user_id=current_user.id, name=dash_data['name']).first():
            raise ConflictError(f"A dashboard named '{dash_data['name']}' already exists for this user.")

        dashboard = Dashboard(**dash_data, creator=current_user)
        db.session.add(dashboard)
        db.session.commit()
        log.info(f"Dashboard '{dashboard.name}' (ID: {dashboard.id}) created by user ID: {current_user.id}.")
        return dashboard, 201

@dashboards_ns.route('/<int:dash_id>')
@dashboards_ns.param('dash_id', 'The Dashboard identifier')
class DashboardResource(Resource):
    @jwt_required_with_identity()
    @owns_resource_or_admin(Dashboard, id_param_name='dash_id')
    @dashboards_ns.marshal_with(dashboard_detail_model) # Use detail model for single fetch
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(403, 'Forbidden (not owner or admin)')
    @dashboards_ns.response(404, 'Dashboard Not Found')
    @dashboards_ns.response(500, 'Internal Server Error')
    def get(self, current_user, dash_id):
        """Retrieve a single dashboard by ID, including its associated visualizations."""
        dashboard = Dashboard.query.options(db.joinedload(Dashboard.visualization_associations).joinedload(DashboardVisualization.visualization)).get_or_404(dash_id)
        log.info(f"Fetching dashboard {dash_id} for user ID: {current_user.id}.")
        return dashboard, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(Dashboard, id_param_name='dash_id')
    @dashboards_ns.expect(dashboard_model, validate=True, skip_none=True)
    @dashboards_ns.marshal_with(dashboard_model)
    @dashboards_ns.response(400, 'Validation Error')
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(403, 'Forbidden (not owner or admin)')
    @dashboards_ns.response(404, 'Dashboard Not Found')
    @dashboards_ns.response(409, 'Conflict (name already exists)')
    @dashboards_ns.response(500, 'Internal Server Error')
    def put(self, current_user, dash_id):
        """Update an existing dashboard."""
        dashboard = Dashboard.query.get_or_404(dash_id)
        data = request.json
        try:
            updated_data = dashboard_schema.load(data, partial=True)
        except Exception as e:
            log.warning(f"Dashboard update validation error for ID {dash_id}: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Check for unique name if name is updated
        if 'name' in updated_data and updated_data['name'] != dashboard.name:
            if Dashboard.query.filter(
                Dashboard.user_id == current_user.id,
                Dashboard.name == updated_data['name'],
                Dashboard.id != dash_id
            ).first():
                raise ConflictError(f"A dashboard named '{updated_data['name']}' already exists for this user.")

        for key, value in updated_data.items():
            setattr(dashboard, key, value)

        db.session.commit()
        log.info(f"Dashboard {dash_id} updated by user ID: {current_user.id}.")
        return dashboard, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(Dashboard, id_param_name='dash_id')
    @dashboards_ns.response(204, 'Dashboard deleted successfully')
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(403, 'Forbidden (not owner or admin)')
    @dashboards_ns.response(404, 'Dashboard Not Found')
    @dashboards_ns.response(500, 'Internal Server Error')
    def delete(self, current_user, dash_id):
        """Delete an existing dashboard."""
        dashboard = Dashboard.query.get_or_404(dash_id)
        db.session.delete(dashboard)
        db.session.commit()
        log.info(f"Dashboard {dash_id} deleted by user ID: {current_user.id}.")
        return '', 204

@dashboards_ns.route('/<int:dash_id>/visualizations')
@dashboards_ns.param('dash_id', 'The Dashboard identifier')
class DashboardVisualizationList(Resource):
    @jwt_required_with_identity()
    @owns_resource_or_admin(Dashboard, id_param_name='dash_id')
    @dashboards_ns.expect(dashboard_viz_add_model, validate=True)
    @dashboards_ns.marshal_with(dashboard_viz_add_model, code=201)
    @dashboards_ns.response(400, 'Validation Error')
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(403, 'Forbidden (not owner or admin)')
    @dashboards_ns.response(404, 'Dashboard or Visualization Not Found')
    @dashboards_ns.response(409, 'Conflict (visualization already on dashboard)')
    @dashboards_ns.response(500, 'Internal Server Error')
    def post(self, current_user, dash_id):
        """Add a visualization to a dashboard."""
        dashboard = Dashboard.query.get_or_404(dash_id)
        data = request.json
        try:
            viz_data = dashboard_viz_schema.load(data)
        except Exception as e:
            log.warning(f"Add visualization to dashboard validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        visualization = Visualization.query.get(viz_data['visualization_id'])
        if not visualization:
            raise NotFoundError(f"Visualization with ID {viz_data['visualization_id']} not found.")

        # Ensure the user owns the visualization they are trying to add
        if visualization.user_id != current_user.id:
            raise ForbiddenError("You do not have permission to add this visualization to the dashboard.")

        # Check if already added
        if DashboardVisualization.query.get((dash_id, viz_data['visualization_id'])):
            raise ConflictError(f"Visualization {viz_data['visualization_id']} is already on dashboard {dash_id}.")

        dash_viz = DashboardVisualization(
            dashboard=dashboard,
            visualization=visualization,
            position_x=viz_data['position_x'],
            position_y=viz_data['position_y'],
            width=viz_data['width'],
            height=viz_data['height']
        )
        db.session.add(dash_viz)
        db.session.commit()
        log.info(f"Visualization {viz_data['visualization_id']} added to dashboard {dash_id} by user ID: {current_user.id}.")
        return dash_viz, 201

@dashboards_ns.route('/<int:dash_id>/visualizations/<int:viz_id>')
@dashboards_ns.param('dash_id', 'The Dashboard identifier')
@dashboards_ns.param('viz_id', 'The Visualization identifier')
class DashboardVisualizationResource(Resource):
    @jwt_required_with_identity()
    @owns_resource_or_admin(Dashboard, id_param_name='dash_id')
    @dashboards_ns.expect(dashboard_viz_add_model, validate=True, skip_none=True) # Re-use add model for updates
    @dashboards_ns.marshal_with(dashboard_viz_add_model)
    @dashboards_ns.response(400, 'Validation Error')
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(403, 'Forbidden (not owner or admin)')
    @dashboards_ns.response(404, 'Dashboard or Visualization Not Found on Dashboard')
    @dashboards_ns.response(500, 'Internal Server Error')
    def put(self, current_user, dash_id, viz_id):
        """Update a visualization's position/size on a dashboard."""
        # Ensure the dashboard exists and user owns it (handled by decorator)
        dashboard = Dashboard.query.get_or_404(dash_id)

        dash_viz = DashboardVisualization.query.get((dash_id, viz_id))
        if not dash_viz:
            raise NotFoundError(f"Visualization {viz_id} not found on dashboard {dash_id}.")

        data = request.json
        try:
            updated_data = dashboard_viz_schema.load(data, partial=True)
        except Exception as e:
            log.warning(f"Update dashboard visualization validation error: {e.messages}", exc_info=True)
            raise BadRequestError(description="Invalid input data.", errors=e.messages)

        # Only position, width, height should be updatable here
        if 'position_x' in updated_data: dash_viz.position_x = updated_data['position_x']
        if 'position_y' in updated_data: dash_viz.position_y = updated_data['position_y']
        if 'width' in updated_data: dash_viz.width = updated_data['width']
        if 'height' in updated_data: dash_viz.height = updated_data['height']
        
        db.session.commit()
        log.info(f"Visualization {viz_id} on dashboard {dash_id} updated by user ID: {current_user.id}.")
        return dash_viz, 200

    @jwt_required_with_identity()
    @owns_resource_or_admin(Dashboard, id_param_name='dash_id')
    @dashboards_ns.response(204, 'Visualization removed from dashboard successfully')
    @dashboards_ns.response(401, 'Unauthorized')
    @dashboards_ns.response(403, 'Forbidden (not owner or admin)')
    @dashboards_ns.response(404, 'Dashboard or Visualization Not Found on Dashboard')
    @dashboards_ns.response(500, 'Internal Server Error')
    def delete(self, current_user, dash_id, viz_id):
        """Remove a visualization from a dashboard."""
        dashboard = Dashboard.query.get_or_404(dash_id)

        dash_viz = DashboardVisualization.query.get((dash_id, viz_id))
        if not dash_viz:
            raise NotFoundError(f"Visualization {viz_id} not found on dashboard {dash_id}.")
        
        db.session.delete(dash_viz)
        db.session.commit()
        log.info(f"Visualization {viz_id} removed from dashboard {dash_id} by user ID: {current_user.id}.")
        return '', 204