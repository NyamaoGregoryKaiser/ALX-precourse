```python
import logging
from app.extensions import db
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.models.comment import Comment
from app.utils.decorators import log_service_operation
from app.utils.exceptions import ResourceNotFound, InvalidInput

logger = logging.getLogger(__name__)

class TaskService:
    @staticmethod
    @log_service_operation
    def create_task(data):
        title = data.get('title')
        project_id = data.get('project_id')
        creator_id = data.get('creator_id')

        if not title or not project_id or not creator_id:
            raise InvalidInput("Title, project ID, and creator ID are required for a task.")

        if not Project.query.get(project_id):
            raise ResourceNotFound(f"Project with ID '{project_id}' not found.")
        if not User.query.get(creator_id):
            raise ResourceNotFound(f"Creator with ID '{creator_id}' not found.")
        if data.get('assigned_to_id') and not User.query.get(data['assigned_to_id']):
            raise ResourceNotFound(f"Assignee with ID '{data['assigned_to_id']}' not found.")

        try:
            task = Task(
                title=title,
                description=data.get('description'),
                project_id=project_id,
                creator_id=creator_id,
                assigned_to_id=data.get('assigned_to_id'),
                status=data.get('status', 'open'),
                priority=data.get('priority', 'medium'),
                due_date=data.get('due_date')
            )
            db.session.add(task)
            db.session.commit()
            logger.info(f"Task created: {task.title}")
            return task
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating task: {e}")
            raise

    @staticmethod
    @log_service_operation
    def get_all_tasks(page=1, per_page=10, project_id=None, assigned_to_id=None, status=None, priority=None):
        query = Task.query
        if project_id:
            query = query.filter_by(project_id=project_id)
        if assigned_to_id:
            query = query.filter_by(assigned_to_id=assigned_to_id)
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)

        tasks = query.paginate(page=page, per_page=per_page, error_out=False)
        return tasks

    @staticmethod
    @log_service_operation
    def get_task_by_id(task_id):
        task = Task.query.get(task_id)
        if not task:
            raise ResourceNotFound(f"Task with ID '{task_id}' not found.")
        return task

    @staticmethod
    @log_service_operation
    def update_task(task_id, data):
        task = TaskService.get_task_by_id(task_id)

        if 'project_id' in data and not Project.query.get(data['project_id']):
            raise ResourceNotFound(f"New project with ID '{data['project_id']}' not found.")
        if 'assigned_to_id' in data and data['assigned_to_id'] and not User.query.get(data['assigned_to_id']):
            raise ResourceNotFound(f"New assignee with ID '{data['assigned_to_id']}' not found.")
        if 'creator_id' in data and not User.query.get(data['creator_id']):
            raise ResourceNotFound(f"New creator with ID '{data['creator_id']}' not found.")

        try:
            task.title = data.get('title', task.title)
            task.description = data.get('description', task.description)
            task.project_id = data.get('project_id', task.project_id)
            task.creator_id = data.get('creator_id', task.creator_id)
            task.assigned_to_id = data.get('assigned_to_id', task.assigned_to_id)
            task.status = data.get('status', task.status)
            task.priority = data.get('priority', task.priority)
            task.due_date = data.get('due_date', task.due_date)
            db.session.commit()
            logger.info(f"Task updated: {task.title}")
            return task
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating task {task_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def delete_task(task_id):
        task = TaskService.get_task_by_id(task_id)
        try:
            db.session.delete(task)
            db.session.commit()
            logger.info(f"Task deleted: {task_id}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting task {task_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def add_comment_to_task(task_id, content, author_id):
        task = TaskService.get_task_by_id(task_id)
        if not User.query.get(author_id):
            raise ResourceNotFound(f"Author with ID '{author_id}' not found.")
        
        try:
            comment = Comment(content=content, task_id=task_id, author_id=author_id)
            db.session.add(comment)
            db.session.commit()
            logger.info(f"Comment added to task {task_id} by user {author_id}")
            return comment
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding comment to task {task_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def get_task_comments(task_id, page=1, per_page=10):
        task = TaskService.get_task_by_id(task_id)
        comments = Comment.query.filter_by(task_id=task.id).order_by(Comment.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return comments

    @staticmethod
    @log_service_operation
    def get_comment_by_id(comment_id):
        comment = Comment.query.get(comment_id)
        if not comment:
            raise ResourceNotFound(f"Comment with ID '{comment_id}' not found.")
        return comment

    @staticmethod
    @log_service_operation
    def update_comment(comment_id, data):
        comment = TaskService.get_comment_by_id(comment_id)
        try:
            comment.content = data.get('content', comment.content)
            db.session.commit()
            logger.info(f"Comment {comment_id} updated.")
            return comment
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating comment {comment_id}: {e}")
            raise

    @staticmethod
    @log_service_operation
    def delete_comment(comment_id):
        comment = TaskService.get_comment_by_id(comment_id)
        try:
            db.session.delete(comment)
            db.session.commit()
            logger.info(f"Comment {comment_id} deleted.")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting comment {comment_id}: {e}")
            raise

```