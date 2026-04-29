from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import MonitoredDatabase, DatabaseType, User
from app.utils.errors import APIError
from app.extensions import cache, limiter

db_api_bp = Blueprint('db_api', __name__)

@db_api_bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit("10 per hour") # Limit creating new DBs
def create_monitored_database():
    """
    Add a new database to monitor.
    Requires: valid JWT, JSON body with db_type, host, port, username, password, database, name.
    Returns: New monitored database details.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    required_fields = ['name', 'db_type', 'host', 'port', 'username', 'password', 'database']
    for field in required_fields:
        if not data.get(field):
            raise APIError(f"Missing required field: {field}", status_code=400)

    try:
        db_type = DatabaseType[data['db_type'].upper()]
    except KeyError:
        raise APIError(f"Invalid database type: {data['db_type']}. Allowed: {', '.join([dt.value for dt in DatabaseType])}", status_code=400)

    new_db = MonitoredDatabase(
        user_id=user_id,
        name=data['name'],
        db_type=db_type,
        host=data['host'],
        port=data['port'],
        username=data['username'],
        password=data['password'],
        database=data['database']
    )

    db.session.add(new_db)
    db.session.commit()
    cache.clear() # Clear cache for DB list

    return jsonify(new_db.to_dict()), 201

@db_api_bp.route('/', methods=['GET'])
@jwt_required()
@cache.cached(timeout=60, query_string=True) # Cache for 60 seconds, vary by query params
@limiter.limit("60 per hour")
def get_all_monitored_databases():
    """
    List all databases monitored by the current user.
    Requires: valid JWT.
    Returns: List of monitored databases.
    """
    user_id = get_jwt_identity()
    dbs = MonitoredDatabase.query.filter_by(user_id=user_id).all()
    return jsonify([db_entry.to_dict() for db_entry in dbs]), 200

@db_api_bp.route('/<int:db_id>', methods=['GET'])
@jwt_required()
@cache.cached(timeout=30) # Cache for 30 seconds
@limiter.limit("100 per hour")
def get_monitored_database(db_id):
    """
    Get details of a specific monitored database.
    Requires: valid JWT, db_id.
    Returns: Monitored database details.
    """
    user_id = get_jwt_identity()
    db_entry = MonitoredDatabase.query.filter_by(id=db_id, user_id=user_id).first()
    if not db_entry:
        raise APIError("Monitored database not found", status_code=404)
    return jsonify(db_entry.to_dict()), 200

@db_api_bp.route('/<int:db_id>', methods=['PUT'])
@jwt_required()
@limiter.limit("30 per hour")
def update_monitored_database(db_id):
    """
    Update details of a specific monitored database.
    Requires: valid JWT, db_id, JSON body with fields to update.
    Returns: Updated monitored database details.
    """
    user_id = get_jwt_identity()
    db_entry = MonitoredDatabase.query.filter_by(id=db_id, user_id=user_id).first()
    if not db_entry:
        raise APIError("Monitored database not found", status_code=404)

    data = request.get_json()
    
    # Update fields if provided
    db_entry.name = data.get('name', db_entry.name)
    db_entry.host = data.get('host', db_entry.host)
    db_entry.port = data.get('port', db_entry.port)
    db_entry.username = data.get('username', db_entry.username)
    db_entry.password = data.get('password', db_entry.password) # Handle sensitive data properly
    db_entry.database = data.get('database', db_entry.database)

    if 'db_type' in data:
        try:
            db_entry.db_type = DatabaseType[data['db_type'].upper()]
        except KeyError:
            raise APIError(f"Invalid database type: {data['db_type']}", status_code=400)

    db.session.commit()
    cache.clear() # Clear cache related to this DB or all DBs

    return jsonify(db_entry.to_dict()), 200

@db_api_bp.route('/<int:db_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per hour")
def delete_monitored_database(db_id):
    """
    Delete a specific monitored database.
    Requires: valid JWT, db_id.
    Returns: Success message.
    """
    user_id = get_jwt_identity()
    db_entry = MonitoredDatabase.query.filter_by(id=db_id, user_id=user_id).first()
    if not db_entry:
        raise APIError("Monitored database not found", status_code=404)

    # TODO: Also delete associated Metrics, OptimizationTasks, Reports
    # For now, rely on cascade delete configured in models or manually handle
    # (Not explicitly set up cascade deletes for all here, should be in a production app)
    db.session.delete(db_entry)
    db.session.commit()
    cache.clear() # Clear cache for DB list

    return jsonify({"message": "Monitored database deleted successfully"}), 200
```