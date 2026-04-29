from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import Metric, MonitoredDatabase, MetricType
from app.utils.errors import APIError
from app.extensions import cache, limiter
from datetime import datetime, timedelta

metric_api_bp = Blueprint('metric_api', __name__)

@metric_api_bp.route('/database/<int:db_id>/latest', methods=['GET'])
@jwt_required()
@cache.cached(timeout=30, query_string=True) # Cache for 30 seconds
@limiter.limit("60 per hour")
def get_latest_metrics_for_db(db_id):
    """
    Get the latest collected metrics for a specific monitored database.
    Requires: valid JWT, db_id.
    Query params: `metric_type` (optional, filter by type).
    Returns: List of latest metrics.
    """
    user_id = get_jwt_identity()
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=user_id).first()
    if not monitored_db:
        raise APIError("Monitored database not found", status_code=404)

    metric_type_filter = request.args.get('metric_type')
    
    query = Metric.query.filter_by(db_id=db_id)

    if metric_type_filter:
        try:
            metric_type_enum = MetricType[metric_type_filter.upper()]
            query = query.filter_by(metric_type=metric_type_enum)
        except KeyError:
            raise APIError(f"Invalid metric type: {metric_type_filter}", status_code=400)
    
    # Group by metric_type and get the latest for each type
    subquery = db.session.query(
        Metric.metric_type,
        db.func.max(Metric.timestamp).label('max_timestamp')
    ).filter(Metric.db_id == db_id).group_by(Metric.metric_type).subquery()

    latest_metrics = query.join(
        subquery,
        db.and_(
            Metric.metric_type == subquery.c.metric_type,
            Metric.timestamp == subquery.c.max_timestamp
        )
    ).all()

    return jsonify([metric.to_dict() for metric in latest_metrics]), 200

@metric_api_bp.route('/database/<int:db_id>/history', methods=['GET'])
@jwt_required()
@cache.cached(timeout=300, query_string=True) # Cache for 5 minutes
@limiter.limit("30 per hour")
def get_historical_metrics_for_db(db_id):
    """
    Get historical metrics for a specific monitored database.
    Requires: valid JWT, db_id.
    Query params: `metric_type` (optional), `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD).
    Returns: List of historical metrics.
    """
    user_id = get_jwt_identity()
    monitored_db = MonitoredDatabase.query.filter_by(id=db_id, user_id=user_id).first()
    if not monitored_db:
        raise APIError("Monitored database not found", status_code=404)

    metric_type_filter = request.args.get('metric_type')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    query = Metric.query.filter_by(db_id=db_id)

    if metric_type_filter:
        try:
            metric_type_enum = MetricType[metric_type_filter.upper()]
            query = query.filter_by(metric_type=metric_type_enum)
        except KeyError:
            raise APIError(f"Invalid metric type: {metric_type_filter}", status_code=400)
    
    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(Metric.timestamp >= start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1) - timedelta(seconds=1) # Include full end day
            query = query.filter(Metric.timestamp <= end_date)
    except ValueError:
        raise APIError("Invalid date format. Use YYYY-MM-DD.", status_code=400)

    metrics = query.order_by(Metric.timestamp.desc()).all()

    return jsonify([metric.to_dict() for metric in metrics]), 200

@metric_api_bp.route('/<int:metric_id>', methods=['GET'])
@jwt_required()
@cache.cached(timeout=30)
@limiter.limit("100 per hour")
def get_metric_details(metric_id):
    """
    Get details of a specific metric entry.
    Requires: valid JWT, metric_id.
    Returns: Metric details.
    """
    user_id = get_jwt_identity()
    metric = Metric.query.get(metric_id)
    if not metric:
        raise APIError("Metric not found", status_code=404)
    
    # Verify ownership of the associated database
    monitored_db = MonitoredDatabase.query.filter_by(id=metric.db_id, user_id=user_id).first()
    if not monitored_db:
        raise APIError("Access denied: Metric does not belong to your monitored databases.", status_code=403)

    return jsonify(metric.to_dict()), 200
```