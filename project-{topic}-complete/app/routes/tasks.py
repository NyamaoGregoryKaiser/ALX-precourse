```python
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.task_service import TaskService
from app.utils.decorators import log_route_access, admin_or_manager_required, task_owner_or_admin_or_manager_required
from app.utils.exceptions import ResourceNotFound, InvalidInput, UnauthorizedAccess

tasks_bp = Blueprint('tasks', __name__)
logger = logging.getLogger(__name__)

@tasks_bp.route('/', methods=['POST'])
@jwt_required()
@log_route_access
def create_task():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    data['creator_id'] = data.get('creator_id', current_user_id)

    try:
        task = TaskService.create_task(data)
        return jsonify(task.to_dict()), 201
    except (InvalidInput, ResourceNotFound) as e:
        return jsonify(message=str(e)), 400
    except Exception as e:
        logger.exception("Error creating task via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/', methods=['GET'])
@jwt_required()
@log_route_access
def get_all_tasks():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    project_id = request.args.get('project_id', type=int)
    assigned_to_id = request.args.get('assigned_to_id', type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')

    try:
        pagination = TaskService.get_all_tasks(page, per_page, project_id, assigned_to_id, status, priority)
        tasks = [task.to_dict() for task in pagination.items]
        return jsonify({
            'tasks': tasks,
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page
        }), 200
    except Exception as e:
        logger.exception("Error fetching all tasks via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
@log_route_access
def get_task_by_id(task_id):
    try:
        task = TaskService.get_task_by_id(task_id)
        return jsonify(task.to_dict()), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error fetching task {task_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required()
@task_owner_or_admin_or_manager_required
@log_route_access
def update_task(task_id):
    data = request.get_json()
    try:
        task = TaskService.update_task(task_id, data)
        return jsonify(task.to_dict()), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except InvalidInput as e:
        return jsonify(message=str(e)), 400
    except UnauthorizedAccess as e:
        return jsonify(message=str(e)), 403
    except Exception as e:
        logger.exception(f"Error updating task {task_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required()
@task_owner_or_admin_or_manager_required
@log_route_access
def delete_task(task_id):
    try:
        TaskService.delete_task(task_id)
        return jsonify(message="Task deleted successfully"), 204
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except UnauthorizedAccess as e:
        return jsonify(message=str(e)), 403
    except Exception as e:
        logger.exception(f"Error deleting task {task_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/<int:task_id>/comments', methods=['POST'])
@jwt_required()
@log_route_access
def add_comment_to_task(task_id):
    data = request.get_json()
    content = data.get('content')
    current_user_id = get_jwt_identity()

    if not content:
        return jsonify(message="Comment content is required"), 400

    try:
        comment = TaskService.add_comment_to_task(task_id, content, current_user_id)
        return jsonify(comment.to_dict()), 201
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error adding comment to task {task_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/<int:task_id>/comments', methods=['GET'])
@jwt_required()
@log_route_access
def get_task_comments(task_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    try:
        pagination = TaskService.get_task_comments(task_id, page, per_page)
        comments = [comment.to_dict() for comment in pagination.items]
        return jsonify({
            'comments': comments,
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page
        }), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error fetching comments for task {task_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
@log_route_access
def update_comment(comment_id):
    data = request.get_json()
    content = data.get('content')
    current_user_id = get_jwt_identity()

    if not content:
        return jsonify(message="Comment content is required"), 400

    try:
        comment = TaskService.get_comment_by_id(comment_id)
        if comment.author_id != current_user_id:
            return jsonify(message="You are not authorized to update this comment."), 403
        
        updated_comment = TaskService.update_comment(comment_id, {'content': content})
        return jsonify(updated_comment.to_dict()), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error updating comment {comment_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@tasks_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
@log_route_access
def delete_comment(comment_id):
    current_user_id = get_jwt_identity()
    try:
        comment = TaskService.get_comment_by_id(comment_id)
        # Check if current user is the author or an admin/manager of the related task/project
        # For simplicity, we'll allow admin/manager of the project to delete any comment.
        # A more granular check would involve checking project manager for project comments,
        # or task creator/assignee for task comments, etc.
        if comment.author_id != current_user_id and not (hasattr(current_user, 'role') and current_user.role in ['admin', 'manager']):
            return jsonify(message="You are not authorized to delete this comment."), 403
        
        TaskService.delete_comment(comment_id)
        return jsonify(message="Comment deleted successfully"), 204
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error deleting comment {comment_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

```