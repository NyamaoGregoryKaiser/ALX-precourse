from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import OptimizationTask, MonitoredDatabase, TaskType, TaskStatus
from app.utils.errors import APIError
from app.tasks import collect_metrics_task, analyze_db_task # Import Celery tasks
from app.extensions import limiter

task_api_bp = Blueprint('task_api', __name__)

@task_api_bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit("10 per hour")
def create_optimization_task():
    """
    Create a new optimization task (e.g., metric collection, analysis).
    Requires: valid JWT, JSON body with db_id, task_type, schedule (optional).
    Returns: New optimization task details.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    required_fields = ['db_id', 'task_type']
    for field in required_fields:
        if not data.get(field):
            raise APIError(f"Missing required field: {field}", status_code=400)

    monitored_db = MonitoredDatabase.query.filter_by(id=data['db_id'], user_id=user_id).first()
    if not monitored_db:
        raise APIError("Monitored database not found or access denied", status_code=404)

    try:
        task_type = TaskType[data['task_type'].upper()]
    except KeyError:
        raise APIError(f"Invalid task type: {data['task_type']}. Allowed: {', '.join([tt.value for tt in TaskType])}", status_code=400)

    new_task = OptimizationTask(
        user_id=user_id,
        db_id=monitored_db.id,
        task_type=task_type,
        schedule=data.get('schedule', 'manual'),
        status=TaskStatus.PENDING # Initially pending
    )

    db.session.add(new_task)
    db.session.commit()

    return jsonify(new_task.to_dict()), 201

@task_api_bp.route('/', methods=['GET'])
@jwt_required()
@limiter.limit("60 per hour")
def get_all_optimization_tasks():
    """
    List all optimization tasks for the current user.
    Requires: valid JWT.
    Query params: `db_id` (optional), `task_type` (optional), `status` (optional).
    Returns: List of optimization tasks.
    """
    user_id = get_jwt_identity()
    db_id_filter = request.args.get('db_id')
    task_type_filter = request.args.get('task_type')
    status_filter = request.args.get('status')

    query = OptimizationTask.query.filter_by(user_id=user_id)

    if db_id_filter:
        try:
            # Ensure the user owns this database
            MonitoredDatabase.query.filter_by(id=db_id_filter, user_id=user_id).first_or_404()
            query = query.filter_by(db_id=db_id_filter)
        except Exception:
            raise APIError("Monitored database not found or access denied", status_code=404)

    if task_type_filter:
        try:
            task_type_enum = TaskType[task_type_filter.upper()]
            query = query.filter_by(task_type=task_type_enum)
        except KeyError:
            raise APIError(f"Invalid task type: {task_type_filter}", status_code=400)

    if status_filter:
        try:
            status_enum = TaskStatus[status_filter.upper()]
            query = query.filter_by(status=status_enum)
        except KeyError:
            raise APIError(f"Invalid task status: {status_filter}", status_code=400)

    tasks = query.order_by(OptimizationTask.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks]), 200

@task_api_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
@limiter.limit("100 per hour")
def get_optimization_task(task_id):
    """
    Get details of a specific optimization task.
    Requires: valid JWT, task_id.
    Returns: Optimization task details.
    """
    user_id = get_jwt_identity()
    task = OptimizationTask.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        raise APIError("Optimization task not found", status_code=404)
    return jsonify(task.to_dict()), 200

@task_api_bp.route('/<int:task_id>/run', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute") # Prevent excessive manual triggers
def run_optimization_task(task_id):
    """
    Manually trigger an existing optimization task to run immediately.
    The task will be sent to Celery for asynchronous execution.
    Requires: valid JWT, task_id.
    Returns: Status message with Celery task ID.
    """
    user_id = get_jwt_identity()
    task_entry = OptimizationTask.query.filter_by(id=task_id, user_id=user_id).first()
    if not task_entry:
        raise APIError("Optimization task not found", status_code=404)

    if task_entry.status == TaskStatus.RUNNING:
        raise APIError("Task is already running", status_code=409)

    monitored_db = MonitoredDatabase.query.get(task_entry.db_id)
    if not monitored_db:
        raise APIError("Target database for this task not found", status_code=404)

    celery_task_result = None
    if task_entry.task_type == TaskType.METRIC_COLLECTION:
        celery_task_result = collect_metrics_task.delay(monitored_db.to_dict(include_sensitive=True), task_entry.id)
    elif task_entry.task_type == TaskType.ANALYSIS:
        celery_task_result = analyze_db_task.delay(monitored_db.to_dict(include_sensitive=True), task_entry.id)
    else:
        raise APIError(f"Unsupported task type for manual run: {task_entry.task_type.value}", status_code=400)

    task_entry.celery_task_id = celery_task_result.id
    task_entry.status = TaskStatus.RUNNING
    db.session.commit()

    return jsonify({"message": "Task initiated successfully", "celery_task_id": celery_task_result.id}), 202

@task_api_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
@limiter.limit("5 per hour")
def delete_optimization_task(task_id):
    """
    Delete a specific optimization task.
    Requires: valid JWT, task_id.
    Returns: Success message.
    """
    user_id = get_jwt_identity()
    task = OptimizationTask.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        raise APIError("Optimization task not found", status_code=404)

    # TODO: Implement Celery task revocation if the task is still running
    if task.status == TaskStatus.RUNNING and task.celery_task_id:
        current_app.logger.warning(f"Attempting to delete running task {task_id}. Consider revoking Celery task {task.celery_task_id} first.")
        # Example: celery.control.revoke(task.celery_task_id, terminate=True)
        # This requires the Celery app instance to be accessible here.

    db.session.delete(task)
    db.session.commit()

    return jsonify({"message": "Optimization task deleted successfully"}), 200
```