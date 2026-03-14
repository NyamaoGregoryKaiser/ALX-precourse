```python
import logging
from app.extensions import db
from app.models.project import Project
from app.models.user import User
from app.utils.decorators import log_service_operation
from app.utils.exceptions import ResourceNotFound, DuplicateResource, InvalidInput

logger = logging.getLogger(__name__)

class ProjectService:
    @staticmethod
    @log_service_operation
    def create_project(data):
        name = data.get('name')
        description = data.get('description')
        manager_id = data.get('manager_id')
        status = data.get('status', 'active')

        if not name or not manager_id:
            raise InvalidInput("Project name and manager ID are required.")

        if Project.query.filter_by(name=name).first():
            raise DuplicateResource(f"Project with name '{name}' already exists.")

        if not User.query.get(manager_id):
            raise ResourceNotFound(f"Manager with ID '{manager_id}' not found.")

        try:
            project = Project(
                name=name,
                description=description,
                manager_id=manager_id,
                status=status,
                start_date=data.get('start_date'),
                end_date=data.get('end_date')
            )
            db.session.add(project)
            db.session.commit()
            logger.info(f"Project created: {project.name}")
            return project
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating project: {e}")
            raise

    @staticmethod
    @log_service_operation
    def get_all_projects(page=1, per_page=10, status=None, manager_id=None):
        query = Project.query
        if status:
            query = query.filter_by(status=status)
        if manager_id:
            query = query.filter_by(manager_id=manager_id)

        projects = query.paginate(page=page, per_page=per_page, error_out=False)
        return projects

    @staticmethod
    @log_service_operation
    def get_project_by_id(project_id):
        project = Project.query.get(project_id)
        if not project:
            raise ResourceNotFound(f"Project with ID '{project_id}' not found.")
        return project

    @staticmethod
    @log_service_operation
    def update_project(project_id, data):
        project = ProjectService.get_project_by_id(project_id)

        if 'name' in data and data['name'] != project.name and \
           Project.query.filter_by(name=data['name']).first():
            raise DuplicateResource(f"Project with name '{data['name']}' already exists.")
        
        if 'manager_id' in data and not User.query.get(data['manager_id']):
            raise ResourceNotFound(f"New manager with ID '{data['manager_id']}' not found.")

        try:
            project.name = data.get('name', project.name)
            project.description = data.get('description', project.description)
            project.manager_id = data.get('manager_id', project.manager_id)
            project.status = data.get('status', project.status)
            project.start_date = data.get('start_date', project.start_date)
            project.end_date = data.get('end_date', project.end_date)
            db.session.commit()
            logger.info(f"Project updated: {project.name}")
            return project
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating project {project_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def delete_project(project_id):
        project = ProjectService.get_project_by_id(project_id)
        try:
            db.session.delete(project)
            db.session.commit()
            logger.info(f"Project deleted: {project_id}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting project {project_id}: {e}")
            raise
```