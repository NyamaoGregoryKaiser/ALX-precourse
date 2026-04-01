```python
from flask import request
from flask_restx import Namespace, Resource, fields, reqparse
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt_claims
from datetime import datetime, timedelta
from performance_monitor.services.metric_service import MetricService
from performance_monitor.services.service_monitoring import ServiceMonitoringService
from performance_monitor.extensions import cache

api = Namespace('metrics', description='Performance metrics operations')

metric_model = api.model('Metric', {
    'id': fields.Integer(readOnly=True, description='The unique identifier of the metric'),
    'endpoint_id': fields.Integer(required=True, description='The ID of the endpoint this metric belongs to'),
    'response_time_ms': fields.Integer(description='Response time in milliseconds'),
    'status_code': fields.Integer(description='HTTP status code of the response'),
    'response_size_bytes': fields.Integer(description='Size of the response body in bytes'),
    'timestamp': fields.DateTime(description='Timestamp of when the metric was recorded'),
    'is_healthy': fields.Boolean(description='True if status_code matches expected_status'),
    'error_message': fields.String(description='Any error message if polling failed or status was unexpected')
})

aggregated_metric_model = api.model('AggregatedMetric', {
    'time_bucket': fields.DateTime(description='Start of the aggregation time bucket'),
    'avg_response_time_ms': fields.Float(description='Average response time in milliseconds for the bucket'),
    'min_response_time_ms': fields.Integer(description='Minimum response time in milliseconds for the bucket'),
    'max_response_time_ms': fields.Integer(description='Maximum response time in milliseconds for the bucket'),
    'health_percentage': fields.Float(description='Percentage of healthy responses in the bucket')
})

service_health_overview_item = api.model('ServiceHealthOverviewItem', {
    'endpoint_id': fields.Integer(description='Endpoint ID'),
    'path': fields.String(description='Endpoint path'),
    'method': fields.String(description='Endpoint method'),
    'latest_response_time_ms': fields.Integer(description='Latest response time'),
    'latest_status_code': fields.Integer(description='Latest status code'),
    'latest_is_healthy': fields.Boolean(description='Latest health status'),
    'latest_timestamp': fields.DateTime(description='Timestamp of latest metric'),
    'latest_error_message': fields.String(description='Error message of latest metric (if any)')
})

dashboard_overview_model = api.model('DashboardOverview', {
    'total_services': fields.Integer(description='Total number of registered services'),
    'active_services': fields.Integer(description='Number of active services'),
    'total_endpoints': fields.Integer(description='Total number of registered endpoints'),
    'active_monitored_endpoints': fields.Integer(description='Number of active endpoints currently being monitored'),
    'total_endpoints_polled_in_window': fields.Integer(description='Total number of endpoints polled in the last time window'),
    'healthy_endpoints_in_window': fields.Integer(description='Number of healthy endpoints in the last time window'),
    'unhealthy_endpoints_in_window': fields.Integer(description='Number of unhealthy endpoints in the last time window'),
    'overall_health_percentage': fields.Float(description='Overall health percentage across all monitored endpoints'),
    'recent_unhealthy_events': fields.List(fields.Nested(api.model('RecentUnhealthyEvent', {
        'endpoint_id': fields.Integer,
        'service_name': fields.String,
        'path': fields.String,
        'method': fields.String,
        'timestamp': fields.DateTime,
        'error_message': fields.String
    }))),
})

# Request parsers for query parameters
raw_metrics_parser = reqparse.RequestParser()
raw_metrics_parser.add_argument('start_time', type=lambda x: datetime.fromisoformat(x.replace('Z', '+00:00')), help='Start time (ISO 8601 format)', required=False, location='args')
raw_metrics_parser.add_argument('end_time', type=lambda x: datetime.fromisoformat(x.replace('Z', '+00:00')), help='End time (ISO 8601 format)', required=False, location='args')
raw_metrics_parser.add_argument('limit', type=int, help='Maximum number of metrics to return', default=100, location='args')

aggregated_metrics_parser = reqparse.RequestParser()
aggregated_metrics_parser.add_argument('time_window_minutes', type=int, help='Time window for aggregation in minutes', default=60, location='args')
aggregated_metrics_parser.add_argument('group_by_interval_minutes', type=int, help='Interval for grouping data in minutes', default=5, location='args')

service_health_parser = reqparse.RequestParser()
service_health_parser.add_argument('time_window_minutes', type=int, help='Time window for health check in minutes', default=30, location='args')


# Helper function for authorization check on service/endpoint
def _check_service_access(service_id):
    current_user_id = get_jwt_identity()
    claims = get_jwt_claims()
    service = ServiceMonitoringService.get_service(service_id)
    if not service:
        api.abort(404, message='Service not found.')
    if service.owner_id != current_user_id and not claims.get('is_admin'):
        api.abort(403, message='Forbidden: You do not own this service or are not an administrator.')
    return service

def _check_endpoint_access(endpoint_id):
    current_user_id = get_jwt_identity()
    claims = get_jwt_claims()
    endpoint = ServiceMonitoringService.get_endpoint(endpoint_id)
    if not endpoint:
        api.abort(404, message='Endpoint not found.')
    if endpoint.service.owner_id != current_user_id and not claims.get('is_admin'):
        api.abort(403, message='Forbidden: You do not own the service for this endpoint or are not an administrator.')
    return endpoint


@api.route('/endpoint/<int:endpoint_id>/raw')
@api.param('endpoint_id', 'The endpoint identifier')
@api.response(404, 'Endpoint not found.')
class EndpointRawMetrics(Resource):
    @jwt_required
    @api.doc('get_raw_endpoint_metrics')
    @api.expect(raw_metrics_parser)
    @api.marshal_list_with(metric_model)
    def get(self, endpoint_id):
        """Retrieve raw metrics for a specific endpoint."""
        _check_endpoint_access(endpoint_id) # Ensures user has access
        args = raw_metrics_parser.parse_args()
        metrics = MetricService.get_metrics_for_endpoint(
            endpoint_id,
            start_time=args['start_time'],
            end_time=args['end_time'],
            limit=args['limit']
        )
        return [m.to_dict() for m in metrics]

@api.route('/endpoint/<int:endpoint_id>/aggregated')
@api.param('endpoint_id', 'The endpoint identifier')
@api.response(404, 'Endpoint not found.')
class EndpointAggregatedMetrics(Resource):
    @jwt_required
    @api.doc('get_aggregated_endpoint_metrics')
    @api.expect(aggregated_metrics_parser)
    @api.marshal_list_with(aggregated_metric_model)
    @cache.cached(timeout=300, query_string=True, make_cache_key=lambda *args, **kwargs: request.url) # Cache for 5 mins
    def get(self, endpoint_id):
        """Retrieve aggregated metrics for a specific endpoint."""
        _check_endpoint_access(endpoint_id) # Ensures user has access
        args = aggregated_metrics_parser.parse_args()
        metrics = MetricService.get_aggregated_metrics_for_endpoint(
            endpoint_id,
            time_window_minutes=args['time_window_minutes'],
            group_by_interval_minutes=args['group_by_interval_minutes']
        )
        return metrics

@api.route('/service/<int:service_id>/health-overview')
@api.param('service_id', 'The service identifier')
@api.response(404, 'Service not found.')
class ServiceHealthOverview(Resource):
    @jwt_required
    @api.doc('get_service_health_overview')
    @api.expect(service_health_parser)
    @api.marshal_list_with(service_health_overview_item)
    @cache.cached(timeout=60, query_string=True, make_cache_key=lambda *args, **kwargs: request.url) # Cache for 1 min
    def get(self, service_id):
        """Retrieve a health overview for all endpoints of a service."""
        _check_service_access(service_id) # Ensures user has access
        args = service_health_parser.parse_args()
        overview = MetricService.get_service_health_overview(
            service_id,
            time_window_minutes=args['time_window_minutes']
        )
        return overview

@api.route('/dashboard-overview')
class DashboardOverview(Resource):
    @jwt_required
    @api.doc('get_dashboard_overview')
    @api.marshal_with(dashboard_overview_model)
    @cache.cached(timeout=60) # Cache for 1 minute for system-wide dashboard
    def get(self):
        """Retrieve a high-level overview of the entire monitoring system."""
        # This endpoint is generally accessible to any logged-in user to see overall system status,
        # but could be restricted to admins if needed.
        overview = MetricService.get_system_dashboard_overview()
        return overview

```