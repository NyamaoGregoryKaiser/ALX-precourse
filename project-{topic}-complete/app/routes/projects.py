```python
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.project_service import ProjectService
from app.utils.decorators import log_route_access, admin_or_manager_required, manager_required_for_project_action
from app.utils.exceptions import ResourceNotFound, DuplicateResource, InvalidInput, UnauthorizedAccess

projects_bp = Blueprint('projects', __name__)
logger = logging.getLogger(__name__)

@projects_bp.route('/', methods=['POST'])
@jwt_required()
@admin_or_manager_required
@log_route_access
def create_project():
    data = request.get_json()
    current_user_id = get_jwt_identity()
    data['manager_id'] = data.get('manager_id', current_user_id) # Default to current user if manager_id not provided

    try:
        project = ProjectService.create_project(data)
        return jsonify(project.to_dict()), 201
    except (InvalidInput, DuplicateResource, ResourceNotFound) as e:
        return jsonify(message=str(e)), 400
    except Exception as e:
        logger.exception("Error creating project via API")
        return jsonify(message="An unexpected error occurred."), 500

@projects_bp.route('/', methods=['GET'])
@jwt_required()
@log_route_access
def get_all_projects():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    manager_id = request.args.get('manager_id', type=int)

    try:
        pagination = ProjectService.get_all_projects(page, per_page, status, manager_id)
        projects = [project.to_dict() for project in pagination.items]
        return jsonify({
            'projects': projects,
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page
        }), 200
    except Exception as e:
        logger.exception("Error fetching all projects via API")
        return jsonify(message="An unexpected error occurred."), 500

@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
@log_route_access
def get_project_by_id(project_id):
    try:
        project = ProjectService.get_project_by_id(project_id)
        return jsonify(project.to_dict()), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except Exception as e:
        logger.exception(f"Error fetching project {project_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
@manager_required_for_project_action
@log_route_access
def update_project(project_id):
    data = request.get_json()
    try:
        project = ProjectService.update_project(project_id, data)
        return jsonify(project.to_dict()), 200
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except (InvalidInput, DuplicateResource) as e:
        return jsonify(message=str(e)), 400
    except UnauthorizedAccess as e:
        return jsonify(message=str(e)), 403
    except Exception as e:
        logger.exception(f"Error updating project {project_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
@manager_required_for_project_action
@log_route_access
def delete_project(project_id):
    try:
        ProjectService.delete_project(project_id)
        return jsonify(message="Project deleted successfully"), 204
    except ResourceNotFound as e:
        return jsonify(message=str(e)), 404
    except UnauthorizedAccess as e:
        return jsonify(message=str(e)), 403
    except Exception as e:
        logger.exception(f"Error deleting project {project_id} via API")
        return jsonify(message="An unexpected error occurred."), 500

```