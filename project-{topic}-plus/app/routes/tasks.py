from flask import Blueprint, jsonify, request
from app.services.task_service import TaskService
from app.schemas import TaskSchema, TaskUpdateSchema, TaskQuerySchema, validate_json_body, validate_query_params
from app.utils.decorators import jwt_and_roles_required, rate_limit, cache_response
from app.models import Role, TaskStatus
from app import cache
import logging

tasks_bp = Blueprint('tasks', __name__)
logger = logging.getLogger(__name__)

@tasks_bp.route('/', methods=['POST'])
@rate_limit("30 per hour")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN])
@validate_json_body(TaskSchema)
def create_task(args, current_user_id, current_user_role):
    """
    Create a new task. (Authenticated user required)
    ---
    tags:
      - Tasks
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - title
          properties:
            title:
              type: string
              description: Title of the task
              minLength: 1
              maxLength: 100
            description:
              type: string
              description: Detailed description of the task
              maxLength: 500
            status:
              type: string
              enum: [pending, in_progress, completed, cancelled]
              description: Initial status of the task. Defaults to 'pending'.
            due_date:
              type: string
              format: date-time
              description: When the task is due (ISO 8601 format)
            assigned_to_id:
              type: integer
              description: ID of the user to whom the task is assigned.
    responses:
      201:
        description: Task successfully created.
        schema:
          type: object
          properties:
            id: {type: integer}
            title: {type: string}
            status: {type: string}
            created_by: {type: integer}
      400:
        $ref: '#/definitions/ErrorResponse'
      401:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    task = TaskService.create_task(
        title=args.get('title'),
        description=args.get('description'),
        due_date=args.get('due_date'),
        status=args.get('status', TaskStatus.PENDING),
        assigned_to_id=args.get('assigned_to_id'),
        created_by_id=current_user_id
    )
    logger.info(f"Task {task.id} created by user {current_user_id}.")
    # Invalidate cache for tasks list
    cache.delete_memoized(get_all_tasks)
    return jsonify(task.to_dict()), 201

@tasks_bp.route('/', methods=['GET'])
@rate_limit("60 per minute")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN])
@validate_query_params(TaskQuerySchema)
# Note: Caching for paginated/filtered lists is complex. This simple cache won't work well
# if filters/pagination vary. A more robust solution would hash query params into the cache key.
# For demonstration, we'll cache 'all' tasks, but in real-world, might cache per user or per query.
@cache_response(timeout=60, key_prefix='all_tasks_list')
def get_all_tasks(current_user_id, current_user_role, **kwargs):
    """
    Retrieve all tasks, with optional filtering and pagination. (Authenticated user required)
    ---
    tags:
      - Tasks
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: status
        type: string
        enum: [pending, in_progress, completed, cancelled]
        description: Filter tasks by status.
      - in: query
        name: created_by_id
        type: integer
        description: Filter tasks by the ID of the user who created them (Admin only).
      - in: query
        name: assigned_to_id
        type: integer
        description: Filter tasks by the ID of the user they are assigned to.
      - in: query
        name: due_date_before
        type: string
        format: date-time
        description: Filter tasks due before this date (ISO 8601).
      - in: query
        name: due_date_after
        type: string
        format: date-time
        description: Filter tasks due after this date (ISO 8601).
      - in: query
        name: page
        type: integer
        default: 1
        description: Page number for pagination.
      - in: query
        name: per_page
        type: integer
        default: 10
        description: Number of tasks per page. (Max 100)
    responses:
      200:
        description: A list of tasks and pagination metadata.
        schema:
          type: object
          properties:
            tasks:
              type: array
              items:
                type: object
                properties:
                  id: {type: integer}
                  title: {type: string}
                  status: {type: string}
                  created_by: {type: integer}
                  assigned_to: {type: integer, nullable: true}
                  due_date: {type: string, format: date-time, nullable: true}
            pagination:
              type: object
              properties:
                total: {type: integer}
                pages: {type: integer}
                page: {type: integer}
                per_page: {type: integer}
                has_next: {type: boolean}
                has_prev: {type: boolean}
      400:
        $ref: '#/definitions/ErrorResponse'
      401:
        $ref: '#/definitions/ErrorResponse'
    """
    filters = {k: v for k, v in kwargs.items() if k not in ['page', 'per_page']}
    page = kwargs.get('page')
    per_page = kwargs.get('per_page')

    tasks, pagination_meta = TaskService.get_all_tasks(current_user_id, current_user_role, filters, page, per_page)
    logger.info(f"User {current_user_id} retrieved {len(tasks)} tasks with filters {filters}.")
    return jsonify({"tasks": [task.to_dict() for task in tasks], "pagination": pagination_meta}), 200

@tasks_bp.route('/<int:task_id>', methods=['GET'])
@rate_limit("60 per minute")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN])
@cache_response(timeout=60, key_prefix='task_detail')
def get_task(task_id, current_user_id, current_user_role):
    """
    Retrieve a specific task by ID. (Admin, creator, or assignee access required)
    ---
    tags:
      - Tasks
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: task_id
        type: integer
        required: true
        description: ID of the task to retrieve.
    responses:
      200:
        description: Details of the specified task.
        schema:
          type: object
          properties:
            id: {type: integer}
            title: {type: string}
            description: {type: string, nullable: true}
            status: {type: string}
            due_date: {type: string, format: date-time, nullable: true}
            created_at: {type: string, format: date-time}
            updated_at: {type: string, format: date-time}
            created_by: {type: integer}
            assigned_to: {type: integer, nullable: true}
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    task = TaskService.get_task_by_id(task_id, current_user_id, current_user_role)
    logger.info(f"User {current_user_id} retrieved task {task_id}.")
    return jsonify(task.to_dict()), 200

@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@rate_limit("30 per hour")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN])
@validate_json_body(TaskUpdateSchema)
def update_task(args, task_id, current_user_id, current_user_role):
    """
    Update a specific task's details. (Admin or task creator access required for core details, assignee for status)
    ---
    tags:
      - Tasks
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: task_id
        type: integer
        required: true
        description: ID of the task to update.
      - in: body
        name: body
        schema:
          type: object
          properties:
            title: {type: string}
            description: {type: string}
            status:
              type: string
              enum: [pending, in_progress, completed, cancelled]
            due_date:
              type: string
              format: date-time
            assigned_to_id:
              type: integer
    responses:
      200:
        description: Task successfully updated.
        schema:
          type: object
          properties:
            id: {type: integer}
            title: {type: string}
            status: {type: string}
      400:
        $ref: '#/definitions/ErrorResponse'
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    updated_task = TaskService.update_task(task_id, current_user_id, current_user_role, args)
    logger.info(f"User {current_user_id} updated task {task_id}.")
    # Invalidate caches for this specific task and the list
    cache.delete_memoized(get_task, task_id=task_id, current_user_id=current_user_id, current_user_role=current_user_role)
    cache.delete_memoized(get_all_tasks)
    return jsonify(updated_task.to_dict()), 200

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@rate_limit("10 per hour")
@jwt_and_roles_required(roles=[Role.USER, Role.ADMIN], fresh=True) # Require fresh token for sensitive action
def delete_task(task_id, current_user_id, current_user_role):
    """
    Delete a specific task by ID. (Admin or task creator access required, fresh token)
    ---
    tags:
      - Tasks
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: task_id
        type: integer
        required: true
        description: ID of the task to delete.
    responses:
      204:
        description: Task successfully deleted.
      401:
        $ref: '#/definitions/ErrorResponse'
      403:
        $ref: '#/definitions/ErrorResponse'
      404:
        $ref: '#/definitions/ErrorResponse'
    """
    TaskService.delete_task(task_id, current_user_id, current_user_role)
    logger.info(f"User {current_user_id} deleted task {task_id}.")
    # Invalidate caches for this specific task and the list
    cache.delete_memoized(get_task, task_id=task_id, current_user_id=current_user_id, current_user_role=current_user_role)
    cache.delete_memoized(get_all_tasks)
    return '', 204
```