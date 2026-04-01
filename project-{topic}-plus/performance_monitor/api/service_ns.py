```python
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt_claims
from performance_monitor.services.service_monitoring import ServiceMonitoringService
from performance_monitor.utils.decorators import admin_required
from performance_monitor.extensions import cache

api = Namespace('services', description='Service monitoring operations')

service_model = api.model('Service', {
    'id': fields.Integer(readOnly=True, description='The unique identifier of a service'),
    'name': fields.String(required=True, description='The name of the service'),
    'description': fields.String(description='A description of the service'),
    'base_url': fields.String(required=True, description='The base URL of the service (e.g., https://api.example.com)'),
    'owner_id': fields.Integer(readOnly=True, description='The ID of the user who owns this service'),
    'is_active': fields.Boolean(description='Whether the service is actively being monitored', default=True),
    'created_at': fields.DateTime(readOnly=True, description='Timestamp of service creation'),
    'updated_at': fields.DateTime(readOnly=True, description='Timestamp of last service update')
})

service_create_model = api.model('ServiceCreate', {
    'name': fields.String(required=True, description='The name of the service'),
    'description': fields.String(description='A description of the service'),
    'base_url': fields.String(required=True, description='The base URL of the service'),
    'is_active': fields.Boolean(description='Whether the service is actively being monitored', default=True)
})

service_update_model = api.model('ServiceUpdate', {
    'name': fields.String(description='The name of the service'),
    'description': fields.String(description='A description of the service'),
    'base_url': fields.String(description='The base URL of the service'),
    'is_active': fields.Boolean(description='Whether the service is actively being monitored')
})


@api.route('/')
class ServiceList(Resource):
    @jwt_required
    @api.doc('list_services')
    @api.marshal_list_with(service_model)
    @cache.cached(timeout=60, query_string=True) # Cache for 1 minute, vary by query string (e.g., owner_id filter)
    def get(self):
        """List all services (admins) or services owned by the current user."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        if claims.get('is_admin'):
            services = ServiceMonitoringService.get_all_services()
        else:
            services = ServiceMonitoringService.get_all_services(owner_id=current_user_id)
        
        return [service.to_dict() for service in services]

    @jwt_required
    @api.doc('create_service')
    @api.expect(service_create_model)
    @api.response(201, 'Service successfully created.')
    @api.response(400, 'Validation Error or Service name already exists.')
    @api.marshal_with(service_model)
    def post(self):
        """Create a new service."""
        current_user_id = get_jwt_identity()
        data = request.json
        service, error = ServiceMonitoringService.create_service(
            data['name'],
            data['base_url'],
            current_user_id,
            data.get('description'),
        )
        if error:
            api.abort(400, message=error)
        cache.clear() # Clear cache for service list
        return service.to_dict(), 201


@api.route('/<int:service_id>')
@api.param('service_id', 'The service identifier')
@api.response(404, 'Service not found.')
class Service(Resource):
    @jwt_required
    @api.doc('get_service')
    @api.marshal_with(service_model)
    @cache.cached(timeout=60, make_cache_key=lambda *args, **kwargs: request.path) # Cache for 1 minute, per service ID
    def get(self, service_id):
        """Fetch a service given its identifier."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        service = ServiceMonitoringService.get_service(service_id)
        if not service:
            api.abort(404, message='Service not found.')
        
        if service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own this service and are not an administrator.')
        
        return service.to_dict()

    @jwt_required
    @api.doc('update_service')
    @api.expect(service_update_model)
    @api.response(200, 'Service successfully updated.')
    @api.response(400, 'Validation Error or Service name already exists.')
    @api.marshal_with(service_model)
    def put(self, service_id):
        """Update a service."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        service = ServiceMonitoringService.get_service(service_id)
        if not service:
            api.abort(404, message='Service not found.')

        if service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own this service and are not an administrator.')

        data = request.json
        updated_service, error = ServiceMonitoringService.update_service(service_id, data)
        if error:
            api.abort(400, message=error)
        
        cache.clear() # Clear all caches on update (simpler for this example)
        return updated_service.to_dict(), 200

    @jwt_required
    @api.doc('delete_service')
    @api.response(204, 'Service successfully deleted.')
    def delete(self, service_id):
        """Delete a service."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        service = ServiceMonitoringService.get_service(service_id)
        if not service:
            api.abort(404, message='Service not found.')

        if service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own this service and are not an administrator.')

        success, error = ServiceMonitoringService.delete_service(service_id)
        if not success:
            api.abort(400, message=error)
        cache.clear() # Clear all caches on delete
        return '', 204

```