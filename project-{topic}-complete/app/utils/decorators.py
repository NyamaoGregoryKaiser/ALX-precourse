```python
import logging
from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.utils.exceptions import UnauthorizedAccess, ResourceNotFound

logger = logging.getLogger(__name__)

def admin_required(fn):
    """Decorator to restrict access to admin users only."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') != 'admin':
            logger.warning(f"Unauthorized attempt by user {get_jwt_identity()} (Role: {claims.get('role')}) to access admin resource: {request.path}")
            raise UnauthorizedAccess("Admins only access.")
        return fn(*args, **kwargs)
    return wrapper

def admin_or_manager_required(fn):
    """Decorator to restrict access to admin or manager users only."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') not in ['admin', 'manager']:
            logger.warning(f"Unauthorized attempt by user {get_jwt_identity()} (Role: {claims.get('role')}) to access admin/manager resource: {request.path}")
            raise UnauthorizedAccess("Admins or Managers only access.")
        return fn(*args, **kwargs)
    return wrapper

def manager_required_for_project_action(fn):
    """
    Decorator to ensure the current user is an admin or the manager of the specific project.
    Expects project_id as a keyword argument in the route function.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_role = claims.get('role')
        
        if current_user_role == 'admin':
            return fn(*args, **kwargs)

        project_id = kwargs.get('project_id')
        if not project_id:
            logger.error(f"manager_required_for_project_action decorator used without project_id in route for user {current_user_id}")
            raise Exception("Project ID missing in route arguments for authorization check.")

        project = Project.query.get(project_id)
        if not project:
            raise ResourceNotFound(f"Project with ID '{project_id}' not found.")

        if project.manager_id != current_user_id:
            logger.warning(f"Unauthorized attempt by user {current_user_id} (Role: {current_user_role}) to manage project {project_id} (Manager: {project.manager_id})")
            raise UnauthorizedAccess("You are not authorized to manage this project.")
        
        return fn(*args, **kwargs)
    return wrapper

def task_owner_or_admin_or_manager_required(fn):
    """
    Decorator to ensure the current user is an admin, the creator of the task,
    the assignee of the task, or the manager of the task's project.
    Expects task_id as a keyword argument in the route function.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        current_user_role = claims.get('role')
        
        if current_user_role == 'admin':
            return fn(*args, **kwargs)

        task_id = kwargs.get('task_id')
        if not task_id:
            logger.error(f"task_owner_or_admin_or_manager_required decorator used without task_id in route for user {current_user_id}")
            raise Exception("Task ID missing in route arguments for authorization check.")

        task = Task.query.get(task_id)
        if not task:
            raise ResourceNotFound(f"Task with ID '{task_id}' not found.")
        
        # Check if current user is the creator or assignee
        if task.creator_id == current_user_id or task.assigned_to_id == current_user_id:
            return fn(*args, **kwargs)

        # Check if current user is the manager of the task's project
        project = Project.query.get(task.project_id)
        if project and project.manager_id == current_user_id:
            if current_user_role == 'manager': # Ensure manager role for project manager access
                return fn(*args, **kwargs)

        logger.warning(f"Unauthorized attempt by user {current_user_id} (Role: {current_user_role}) to modify task {task_id}")
        raise UnauthorizedAccess("You are not authorized to perform this action on this task.")
        
    return wrapper

def log_route_access(fn):
    """Decorator to log access to API routes."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            pass # JWT not present or invalid, will be handled by other decorators if required
        
        logger.debug(f"API Access: User {user_id if user_id else 'anonymous'} {request.method} {request.path}")
        return fn(*args, **kwargs)
    return wrapper

def log_service_operation(fn):
    """Decorator to log service layer operations."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            logger.debug(f"Service Operation: {fn.__name__} successful with args={args}, kwargs={kwargs}")
            return result
        except Exception as e:
            logger.error(f"Service Operation: {fn.__name__} failed with args={args}, kwargs={kwargs}. Error: {e}")
            raise
    return wrapper

def log_model_operation(cls):
    """Class decorator to log database model operations (create, update, delete)."""
    original_init = cls.__init__

    @wraps(original_init)
    def new_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        logger.debug(f"Model Created: {cls.__name__} instance with data: {self.__dict__}")

    cls.__init__ = new_init

    # You could also override __setattr__ or integrate with SQLAlchemy events
    # For now, a simpler init logging. Full CRUD event logging requires SQLAlchemy event listeners.
    return cls

```