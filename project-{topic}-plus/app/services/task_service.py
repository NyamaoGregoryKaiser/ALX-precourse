import logging
from datetime import datetime
from app import db
from app.models import Task, User, TaskStatus, Role
from app.utils.exceptions import NotFoundError, ForbiddenError, BadRequestError

logger = logging.getLogger(__name__)

class TaskService:
    """
    Service layer for managing task-related business logic.
    Handles CRUD operations for tasks and associated authorization.
    """

    @staticmethod
    def create_task(title, description, due_date, status, assigned_to_id, created_by_id):
        """
        Creates a new task.
        Args:
            title (str): The title of the task.
            description (str): The description of the task.
            due_date (datetime): The due date of the task.
            status (TaskStatus): The initial status of the task.
            assigned_to_id (int): The ID of the user to assign the task to.
            created_by_id (int): The ID of the user creating the task.
        Returns:
            Task: The newly created task object.
        Raises:
            NotFoundError: If assigned_to_id refers to a non-existent user.
            BadRequestError: If due_date is in the past.
        """
        if due_date and due_date < datetime.utcnow():
            logger.warning(f"Attempted to create task with past due date: {due_date}")
            raise BadRequestError("Due date cannot be in the past.")

        assigned_to_user = None
        if assigned_to_id:
            assigned_to_user = User.query.get(assigned_to_id)
            if not assigned_to_user:
                logger.warning(f"Task creation failed: Assigned user with ID {assigned_to_id} not found.")
                raise NotFoundError(f"Assigned user with ID {assigned_to_id} not found.")

        new_task = Task(
            title=title,
            description=description,
            due_date=due_date,
            status=status,
            created_by_id=created_by_id,
            assigned_to_id=assigned_to_id
        )

        db.session.add(new_task)
        db.session.commit()
        logger.info(f"Task '{title}' (ID: {new_task.id}) created by user {created_by_id}.")
        return new_task

    @staticmethod
    def get_task_by_id(task_id, current_user_id, current_user_role):
        """
        Retrieves a single task by ID with authorization.
        Args:
            task_id (int): The ID of the task.
            current_user_id (int): The ID of the user requesting the task.
            current_user_role (Role): The role of the user requesting the task.
        Returns:
            Task: The task object.
        Raises:
            NotFoundError: If the task does not exist.
            ForbiddenError: If the user is not authorized to view the task.
        """
        task = Task.query.get(task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found.")
            raise NotFoundError("Task not found.")

        # Authorization: Admins can view any task. Regular users can only view tasks they created or are assigned to.
        if current_user_role != Role.ADMIN and \
           current_user_id != task.created_by_id and \
           current_user_id != task.assigned_to_id:
            logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to access task {task_id} without authorization.")
            raise ForbiddenError("You are not authorized to view this task.")

        logger.debug(f"Retrieved task: '{task.title}' (ID: {task.id}) by user {current_user_id}.")
        return task

    @staticmethod
    def get_all_tasks(current_user_id, current_user_role, filters, page, per_page):
        """
        Retrieves all tasks (or filtered tasks) with authorization.
        Args:
            current_user_id (int): The ID of the user requesting tasks.
            current_user_role (Role): The role of the user requesting tasks.
            filters (dict): Dictionary of query filters (e.g., status, created_by_id).
            page (int): Current page number for pagination.
            per_page (int): Number of items per page for pagination.
        Returns:
            tuple: (list[Task], pagination_metadata)
        """
        query = Task.query

        # Authorization: Admins get all tasks. Regular users only get their tasks.
        if current_user_role != Role.ADMIN:
            query = query.filter((Task.created_by_id == current_user_id) | (Task.assigned_to_id == current_user_id))
            logger.debug(f"User {current_user_id} (Role: {current_user_role.value}) fetching only own/assigned tasks.")
        else:
            logger.debug(f"Admin user {current_user_id} fetching all tasks.")


        # Apply filters
        if 'status' in filters:
            query = query.filter_by(status=filters['status'])
        if 'created_by_id' in filters:
            query = query.filter_by(created_by_id=filters['created_by_id'])
        if 'assigned_to_id' in filters:
            query = query.filter_by(assigned_to_id=filters['assigned_to_id'])
        if 'due_date_before' in filters:
            query = query.filter(Task.due_date < filters['due_date_before'])
        if 'due_date_after' in filters:
            query = query.filter(Task.due_date > filters['due_date_after'])

        # Order by creation date descending by default
        query = query.order_by(Task.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        tasks = pagination.items

        logger.debug(f"Retrieved {len(tasks)} tasks (page {page} of {pagination.pages}) for user {current_user_id}.")
        return tasks, {
            "total": pagination.total,
            "pages": pagination.pages,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        }

    @staticmethod
    def update_task(task_id, current_user_id, current_user_role, data):
        """
        Updates an existing task's details with authorization.
        Args:
            task_id (int): The ID of the task to update.
            current_user_id (int): The ID of the user performing the update.
            current_user_role (Role): The role of the user performing the update.
            data (dict): Dictionary containing fields to update.
        Returns:
            Task: The updated task object.
        Raises:
            NotFoundError: If the task does not exist.
            ForbiddenError: If the user is not authorized to update the task.
            BadRequestError: If due_date is in the past.
            NotFoundError: If assigned_to_id refers to a non-existent user.
        """
        task = TaskService.get_task_by_id(task_id, current_user_id, current_user_role) # Reuse authorization logic

        # Further authorization: Only task creator or admin can update title/description/assignment.
        # Any user assigned or creator can update status.
        if current_user_role != Role.ADMIN and current_user_id != task.created_by_id:
            # If a non-admin, non-creator tries to update anything other than status
            if any(key in data for key in ['title', 'description', 'due_date', 'assigned_to_id']):
                logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to modify core task details (ID: {task_id}) without creator/admin rights.")
                raise ForbiddenError("You are not authorized to modify this task's core details.")
            # If they are just assigned and trying to update status
            elif current_user_id == task.assigned_to_id and 'status' in data:
                # Allowed to update status
                pass
            else:
                logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to update task {task_id} without authorization.")
                raise ForbiddenError("You are not authorized to update this task.")


        # Handle assigned_to_id update
        if 'assigned_to_id' in data:
            assigned_to_id = data['assigned_to_id']
            if assigned_to_id is not None:
                assigned_to_user = User.query.get(assigned_to_id)
                if not assigned_to_user:
                    logger.warning(f"Task update failed: Assigned user with ID {assigned_to_id} not found.")
                    raise NotFoundError(f"Assigned user with ID {assigned_to_id} not found.")
            task.assigned_to_id = assigned_to_id

        # Update other fields
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'status' in data:
            task.status = data['status']
        if 'due_date' in data:
            due_date = data['due_date']
            if due_date and due_date < datetime.utcnow() and due_date.date() != datetime.utcnow().date(): # Allow same-day past due, but not old dates
                 logger.warning(f"Attempted to update task {task_id} with past due date: {due_date}")
                 raise BadRequestError("Due date cannot be in the past.")
            task.due_date = due_date

        db.session.commit()
        logger.info(f"Task {task.id} updated by user {current_user_id}.")
        return task

    @staticmethod
    def delete_task(task_id, current_user_id, current_user_role):
        """
        Deletes a task with authorization.
        Args:
            task_id (int): The ID of the task to delete.
            current_user_id (int): The ID of the user performing the deletion.
            current_user_role (Role): The role of the user performing the deletion.
        Raises:
            NotFoundError: If the task does not exist.
            ForbiddenError: If the user is not authorized to delete the task.
        """
        task = Task.query.get(task_id)
        if not task:
            logger.warning(f"Attempted to delete non-existent task with ID {task_id}.")
            raise NotFoundError("Task not found.")

        # Authorization: Only the task creator or an admin can delete a task.
        if current_user_role != Role.ADMIN and current_user_id != task.created_by_id:
            logger.warning(f"User {current_user_id} (Role: {current_user_role.value}) attempted to delete task {task_id} without creator/admin rights.")
            raise ForbiddenError("You are not authorized to delete this task.")

        db.session.delete(task)
        db.session.commit()
        logger.info(f"Task {task_id} deleted successfully by user {current_user_id}.")
```