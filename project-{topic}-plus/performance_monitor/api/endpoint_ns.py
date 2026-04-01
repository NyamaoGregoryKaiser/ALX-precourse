```python
from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt_claims
from performance_monitor.services.service_monitoring import ServiceMonitoringService
from performance_monitor.extensions import cache

api = Namespace('endpoints', description='Endpoint monitoring operations')

endpoint_model = api.model('Endpoint', {
    'id': fields.Integer(readOnly=True, description='The unique identifier of an endpoint'),
    'service_id': fields.Integer(required=True, description='The ID of the service this endpoint belongs to'),
    'path': fields.String(required=True, description='The path relative to the service base URL (e.g., /users or /health)'),
    'method': fields.String(enum=['GET', 'POST', 'PUT', 'DELETE'], default='GET', description='The HTTP method to use for polling'),
    'expected_status': fields.Integer(default=200, description='The HTTP status code expected for a healthy response'),
    'polling_interval_seconds': fields.Integer(default=60, description='How often to poll this endpoint (in seconds)'),
    'last_polled_at': fields.DateTime(readOnly=True, description='Timestamp of the last poll'),
    'last_status': fields.Integer(readOnly=True, description='Last recorded HTTP status code'),
    'is_active': fields.Boolean(description='Whether the endpoint is actively being monitored', default=True),
    'created_at': fields.DateTime(readOnly=True, description='Timestamp of endpoint creation'),
    'updated_at': fields.DateTime(readOnly=True, description='Timestamp of last endpoint update')
})

endpoint_create_model = api.model('EndpointCreate', {
    'service_id': fields.Integer(required=True, description='The ID of the service this endpoint belongs to'),
    'path': fields.String(required=True, description='The path relative to the service base URL'),
    'method': fields.String(enum=['GET', 'POST', 'PUT', 'DELETE'], default='GET', description='The HTTP method to use for polling'),
    'expected_status': fields.Integer(default=200, description='The HTTP status code expected for a healthy response'),
    'polling_interval_seconds': fields.Integer(default=60, description='How often to poll this endpoint (in seconds)'),
    'is_active': fields.Boolean(description='Whether the endpoint is actively being monitored', default=True)
})

endpoint_update_model = api.model('EndpointUpdate', {
    'path': fields.String(description='The path relative to the service base URL'),
    'method': fields.String(enum=['GET', 'POST', 'PUT', 'DELETE'], description='The HTTP method to use for polling'),
    'expected_status': fields.Integer(description='The HTTP status code expected for a healthy response'),
    'polling_interval_seconds': fields.Integer(description='How often to poll this endpoint (in seconds)'),
    'is_active': fields.Boolean(description='Whether the endpoint is actively being monitored')
})


@api.route('/service/<int:service_id>')
@api.param('service_id', 'The service identifier')
@api.response(404, 'Service not found.')
class ServiceEndpoints(Resource):
    @jwt_required
    @api.doc('list_service_endpoints')
    @api.marshal_list_with(endpoint_model)
    @cache.cached(timeout=60, make_cache_key=lambda *args, **kwargs: request.path)
    def get(self, service_id):
        """List all endpoints for a specific service."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        service = ServiceMonitoringService.get_service(service_id)
        if not service:
            api.abort(404, message='Service not found.')
        
        if service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own this service and are not an administrator.')

        endpoints = ServiceMonitoringService.get_service_endpoints(service_id)
        return [ep.to_dict() for ep in endpoints]

    @jwt_required
    @api.doc('create_endpoint')
    @api.expect(endpoint_create_model)
    @api.response(201, 'Endpoint successfully created.')
    @api.response(400, 'Validation Error or Endpoint already exists.')
    @api.marshal_with(endpoint_model)
    def post(self, service_id):
        """Create a new endpoint for a service."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        service = ServiceMonitoringService.get_service(service_id)
        if not service:
            api.abort(404, message='Service not found.')
        
        if service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own this service and are not an administrator.')
        
        data = request.json
        if data.get('service_id') and data['service_id'] != service_id:
            api.abort(400, message='Service ID in body must match URL.')

        endpoint, error = ServiceMonitoringService.create_endpoint(
            service_id,
            data['path'],
            data.get('method', 'GET'),
            data.get('expected_status', 200),
            data.get('polling_interval_seconds')
        )
        if error:
            api.abort(400, message=error)
        cache.clear() # Clear relevant caches
        return endpoint.to_dict(), 201


@api.route('/<int:endpoint_id>')
@api.param('endpoint_id', 'The endpoint identifier')
@api.response(404, 'Endpoint not found.')
class Endpoint(Resource):
    @jwt_required
    @api.doc('get_endpoint')
    @api.marshal_with(endpoint_model)
    @cache.cached(timeout=60, make_cache_key=lambda *args, **kwargs: request.path)
    def get(self, endpoint_id):
        """Fetch an endpoint given its identifier."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        endpoint = ServiceMonitoringService.get_endpoint(endpoint_id)
        if not endpoint:
            api.abort(404, message='Endpoint not found.')
        
        if endpoint.service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own the service for this endpoint and are not an administrator.')
        
        return endpoint.to_dict()

    @jwt_required
    @api.doc('update_endpoint')
    @api.expect(endpoint_update_model)
    @api.response(200, 'Endpoint successfully updated.')
    @api.response(400, 'Validation Error or Endpoint already exists.')
    @api.marshal_with(endpoint_model)
    def put(self, endpoint_id):
        """Update an endpoint."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        endpoint = ServiceMonitoringService.get_endpoint(endpoint_id)
        if not endpoint:
            api.abort(404, message='Endpoint not found.')

        if endpoint.service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own the service for this endpoint and are not an administrator.')

        data = request.json
        updated_endpoint, error = ServiceMonitoringService.update_endpoint(endpoint_id, data)
        if error:
            api.abort(400, message=error)
        
        cache.clear() # Clear all caches on update
        return updated_endpoint.to_dict(), 200

    @jwt_required
    @api.doc('delete_endpoint')
    @api.response(204, 'Endpoint successfully deleted.')
    def delete(self, endpoint_id):
        """Delete an endpoint."""
        current_user_id = get_jwt_identity()
        claims = get_jwt_claims()

        endpoint = ServiceMonitoringService.get_endpoint(endpoint_id)
        if not endpoint:
            api.abort(404, message='Endpoint not found.')

        if endpoint.service.owner_id != current_user_id and not claims.get('is_admin'):
            api.abort(403, message='Forbidden: You do not own the service for this endpoint and are not an administrator.')

        success, error = ServiceMonitoringService.delete_endpoint(endpoint_id)
        if not success:
            api.abort(400, message=error)
        cache.clear() # Clear all caches on delete
        return '', 204

```