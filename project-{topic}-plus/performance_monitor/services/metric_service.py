```python
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from performance_monitor.extensions import db
from performance_monitor.models import Metric, Endpoint, Service

class MetricService:
    """
    Business logic for retrieving and summarizing performance metrics.
    """

    @staticmethod
    def get_metrics_for_endpoint(endpoint_id, start_time=None, end_time=None, limit=100):
        """
        Retrieves metrics for a specific endpoint within a time range.
        Defaults to the last 100 metrics.
        """
        query = Metric.query.filter_by(endpoint_id=endpoint_id)

        if start_time:
            query = query.filter(Metric.timestamp >= start_time)
        if end_time:
            query = query.filter(Metric.timestamp <= end_time)

        return query.order_by(Metric.timestamp.desc()).limit(limit).all()

    @staticmethod
    def get_latest_metric_for_endpoint(endpoint_id):
        """Retrieves the most recent metric for an endpoint."""
        return Metric.query.filter_by(endpoint_id=endpoint_id).order_by(Metric.timestamp.desc()).first()

    @staticmethod
    def get_aggregated_metrics_for_endpoint(endpoint_id, time_window_minutes=60, group_by_interval_minutes=5):
        """
        Aggregates metrics for a specific endpoint over a time window,
        grouped by a specified interval.
        Returns average response time, min/max response time, and health percentage.
        """
        now = datetime.utcnow()
        start_time = now - timedelta(minutes=time_window_minutes)

        # Calculate the bucket start for grouping
        # This truncates the timestamp to the nearest group_by_interval_minutes
        # e.g., if group_by_interval_minutes=5, 10:02 becomes 10:00, 10:07 becomes 10:05
        # Note: This approach is simpler but might not perfectly align with specific time zones without more complex date_trunc logic.
        bucket_interval_seconds = group_by_interval_minutes * 60
        timestamp_bucket = func.to_timestamp(func.floor(func.extract('epoch', Metric.timestamp) / bucket_interval_seconds) * bucket_interval_seconds)

        metrics = db.session.query(
            timestamp_bucket.label('time_bucket'),
            func.avg(Metric.response_time_ms).label('avg_response_time_ms'),
            func.min(Metric.response_time_ms).label('min_response_time_ms'),
            func.max(Metric.response_time_ms).label('max_response_time_ms'),
            func.sum(db.case([(Metric.is_healthy == True, 1)], else_=0)).label('healthy_count'),
            func.count(Metric.id).label('total_count')
        ).filter(
            Metric.endpoint_id == endpoint_id,
            Metric.timestamp >= start_time
        ).group_by(
            'time_bucket'
        ).order_by(
            'time_bucket'
        ).all()

        results = []
        for m in metrics:
            health_percentage = (m.healthy_count / m.total_count) * 100 if m.total_count > 0 else 0
            results.append({
                'time_bucket': m.time_bucket.isoformat(),
                'avg_response_time_ms': round(m.avg_response_time_ms, 2) if m.avg_response_time_ms else 0,
                'min_response_time_ms': m.min_response_time_ms,
                'max_response_time_ms': m.max_response_time_ms,
                'health_percentage': round(health_percentage, 2)
            })
        return results

    @staticmethod
    def get_service_health_overview(service_id, time_window_minutes=30):
        """
        Provides a health overview for all endpoints within a service
        over a specified time window.
        """
        now = datetime.utcnow()
        start_time = now - timedelta(minutes=time_window_minutes)

        # Subquery to get the latest metric for each endpoint within the window
        latest_metrics_subquery = db.session.query(
            Metric.endpoint_id,
            func.max(Metric.timestamp).label('max_timestamp')
        ).filter(
            Metric.timestamp >= start_time,
            Metric.endpoint_id.in_(
                db.session.query(Endpoint.id).filter(Endpoint.service_id == service_id).subquery()
            )
        ).group_by(Metric.endpoint_id).subquery()

        # Join to get the actual latest metric details
        latest_metrics = db.session.query(
            Endpoint.id.label('endpoint_id'),
            Endpoint.path,
            Endpoint.method,
            Metric.response_time_ms,
            Metric.status_code,
            Metric.is_healthy,
            Metric.timestamp,
            Metric.error_message
        ).join(
            latest_metrics_subquery,
            db.and_(
                Metric.endpoint_id == latest_metrics_subquery.c.endpoint_id,
                Metric.timestamp == latest_metrics_subquery.c.max_timestamp
            )
        ).join(
            Endpoint, Endpoint.id == Metric.endpoint_id
        ).filter(
            Endpoint.service_id == service_id
        ).all()

        overview = []
        for m in latest_metrics:
            overview.append({
                'endpoint_id': m.endpoint_id,
                'path': m.path,
                'method': m.method,
                'latest_response_time_ms': m.response_time_ms,
                'latest_status_code': m.status_code,
                'latest_is_healthy': m.is_healthy,
                'latest_timestamp': m.timestamp.isoformat(),
                'latest_error_message': m.error_message
            })
        return overview

    @staticmethod
    def get_system_dashboard_overview(time_window_minutes=60):
        """
        Provides a high-level overview of the entire system's health.
        Counts active services, endpoints, and general health status.
        Uses caching for performance.
        """
        from performance_monitor.extensions import cache
        cache_key = f"system_dashboard_overview_{time_window_minutes}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        now = datetime.utcnow()
        start_time = now - timedelta(minutes=time_window_minutes)

        total_services = Service.query.count()
        active_services = Service.query.filter_by(is_active=True).count()
        total_endpoints = Endpoint.query.count()
        active_endpoints = Endpoint.query.filter_by(is_active=True).join(Service).filter(Service.is_active==True).count()

        # Get the latest metric for each active endpoint within the time window
        latest_metrics_subquery = db.session.query(
            Metric.endpoint_id,
            func.max(Metric.timestamp).label('max_timestamp')
        ).filter(
            Metric.timestamp >= start_time,
            Metric.endpoint_id.in_(
                db.session.query(Endpoint.id).filter(Endpoint.is_active == True).join(Service).filter(Service.is_active==True).subquery()
            )
        ).group_by(Metric.endpoint_id).subquery()

        # Count healthy/unhealthy from these latest metrics
        health_summary = db.session.query(
            func.sum(db.case([(Metric.is_healthy == True, 1)], else_=0)).label('healthy_endpoints_count'),
            func.sum(db.case([(Metric.is_healthy == False, 1)], else_=0)).label('unhealthy_endpoints_count')
        ).join(
            latest_metrics_subquery,
            db.and_(
                Metric.endpoint_id == latest_metrics_subquery.c.endpoint_id,
                Metric.timestamp == latest_metrics_subquery.c.max_timestamp
            )
        ).first()

        healthy_count = health_summary.healthy_endpoints_count or 0
        unhealthy_count = health_summary.unhealthy_endpoints_count or 0
        total_polled_endpoints = healthy_count + unhealthy_count
        overall_health_percentage = (healthy_count / total_polled_endpoints) * 100 if total_polled_endpoints > 0 else 100

        # Get recent critical alerts (e.g., endpoints that have been unhealthy for a while)
        # This is a simplified example; a real alert system would be more complex.
        recent_unhealthy_endpoints = db.session.query(
            Endpoint.id,
            Endpoint.path,
            Endpoint.method,
            Service.name.label('service_name'),
            Metric.timestamp,
            Metric.error_message
        ).join(Service, Service.id == Endpoint.service_id)\
        .join(Metric, Metric.endpoint_id == Endpoint.id)\
        .filter(
            Metric.timestamp >= start_time,
            Metric.is_healthy == False
        )\
        .order_by(Metric.timestamp.desc())\
        .limit(10).all() # Last 10 unhealthy reports

        overview_data = {
            'total_services': total_services,
            'active_services': active_services,
            'total_endpoints': total_endpoints,
            'active_monitored_endpoints': active_endpoints, # endpoints linked to active services and active themselves
            'total_endpoints_polled_in_window': total_polled_endpoints,
            'healthy_endpoints_in_window': healthy_count,
            'unhealthy_endpoints_in_window': unhealthy_count,
            'overall_health_percentage': round(overall_health_percentage, 2),
            'recent_unhealthy_events': [
                {
                    'endpoint_id': e.id,
                    'service_name': e.service_name,
                    'path': e.path,
                    'method': e.method,
                    'timestamp': e.timestamp.isoformat(),
                    'error_message': e.error_message
                } for e in recent_unhealthy_endpoints
            ]
        }
        cache.set(cache_key, overview_data)
        return overview_data

```