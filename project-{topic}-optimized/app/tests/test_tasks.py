import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.project import project as crud_project
from app.crud.task import task as crud_task
from app.crud.user import user as crud_user
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate, TaskUpdate
from app.schemas.user import UserCreate
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import date, timedelta

@pytest.fixture
async def create_user_project_task(regular_user_token_headers, db_session: AsyncSession):
    """Fixture to create a user, project, and task."""
    headers, user = regular_user_token_headers
    project_in = ProjectCreate(name="Test Project for Task", description="Description.")
    project = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=user.id)
    
    task_in = TaskCreate(
        title="First Task",
        description="Details for first task",
        project_id=project.id,
        assignee_id=user.id,
        due_date=date.today() + timedelta(days=7)
    )
    task = await crud_task.create(db_session, obj_in=task_in)
    return headers, user, project, task

@pytest.fixture
async def create_another_user_and_project(client: AsyncClient, db_session: AsyncSession):
    """Fixture to create another user and their project."""
    user_in = UserCreate(username="another_test_user", email="another@example.com", password="password")
    another_user = await crud_user.create(db_session, obj_in=user_in)
    
    login_data = {"username": another_user.email, "password": "password"}
    r_login = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    another_user_headers = {"Authorization": f"Bearer {r_login.json()['access_token']}"}

    project_in = ProjectCreate(name="Another User's Project", description="Desc.")
    another_project = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=another_user.id)
    return another_user_headers, another_user, another_project

@pytest.mark.asyncio
async def test_create_task(client: AsyncClient, create_user_project):
    """Test creating a new task."""
    headers, user, project, _ = create_user_project
    task_data = {
        "title": "New Task",
        "description": "New task description",
        "project_id": str(project.id),
        "assignee_id": str(user.id),
        "status": "pending",
        "due_date": str(date.today() + timedelta(days=10))
    }
    r = await client.post(f"{settings.API_V1_STR}/tasks/", headers=headers, json=task_data)
    assert r.status_code == 201
    created_task = r.json()
    assert created_task["title"] == task_data["title"]
    assert created_task["project_id"] == task_data["project_id"]
    assert created_task["assignee_id"] == task_data["assignee_id"]

@pytest.mark.asyncio
async def test_create_task_invalid_project(client: AsyncClient, regular_user_token_headers):
    """Test creating a task for a non-existent project."""
    headers, user = regular_user_token_headers
    non_existent_project_id = UUID("00000000-0000-4000-8000-000000000001")
    task_data = {
        "title": "Invalid Project Task",
        "project_id": str(non_existent_project_id),
        "assignee_id": str(user.id),
    }
    r = await client.post(f"{settings.API_V1_STR}/tasks/", headers=headers, json=task_data)
    assert r.status_code == 404
    assert "project not found" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_create_task_unauthorized_project(client: AsyncClient, create_another_user_and_project, regular_user_token_headers):
    """Test creating a task in another user's project."""
    headers, user = regular_user_token_headers
    another_user_headers, _, another_project = create_another_user_and_project

    task_data = {
        "title": "Unauthorized Task",
        "project_id": str(another_project.id),
        "assignee_id": str(user.id),
    }
    r = await client.post(f"{settings.API_V1_STR}/tasks/", headers=headers, json=task_data)
    assert r.status_code == 403
    assert "not authorized to create tasks in this project" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_read_tasks_by_assignee(client: AsyncClient, create_user_project):
    """Test retrieving tasks assigned to the current user (default)."""
    headers, user, _, task = create_user_project
    r = await client.get(f"{settings.API_V1_STR}/tasks/", headers=headers)
    assert r.status_code == 200
    tasks = r.json()
    assert isinstance(tasks, list)
    assert len(tasks) == 1
    assert tasks[0]["id"] == str(task.id)
    assert tasks[0]["assignee_id"] == str(user.id)

@pytest.mark.asyncio
async def test_read_tasks_by_project_id(client: AsyncClient, create_user_project):
    """Test retrieving tasks by project ID for an authorized user."""
    headers, _, project, task = create_user_project
    r = await client.get(f"{settings.API_V1_STR}/tasks/?project_id={project.id}", headers=headers)
    assert r.status_code == 200
    tasks = r.json()
    assert isinstance(tasks, list)
    assert len(tasks) == 1
    assert tasks[0]["id"] == str(task.id)
    assert tasks[0]["project_id"] == str(project.id)

@pytest.mark.asyncio
async def test_read_tasks_by_project_id_unauthorized(client: AsyncClient, create_another_user_and_project, regular_user_token_headers, db_session: AsyncSession):
    """Test retrieving tasks by project ID for an unauthorized user."""
    headers, user = regular_user_token_headers
    another_user_headers, another_user, another_project = create_another_user_and_project
    
    # Create a task in another_project
    task_in = TaskCreate(title="Another Task", project_id=another_project.id, assignee_id=another_user.id)
    await crud_task.create(db_session, obj_in=task_in)

    r = await client.get(f"{settings.API_V1_STR}/tasks/?project_id={another_project.id}", headers=headers)
    assert r.status_code == 403
    assert "not authorized to view tasks in this project" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_read_task_by_id(client: AsyncClient, create_user_project):
    """Test retrieving a single task by ID."""
    headers, _, _, task = create_user_project
    r = await client.get(f"{settings.API_V1_STR}/tasks/{task.id}", headers=headers)
    assert r.status_code == 200
    retrieved_task = r.json()
    assert retrieved_task["id"] == str(task.id)
    assert retrieved_task["title"] == task.title

@pytest.mark.asyncio
async def test_read_task_by_id_unauthorized(client: AsyncClient, create_another_user_and_project, create_user_project, db_session: AsyncSession):
    """Test reading a task not owned by user and not assigned to user."""
    headers_user1, user1, project1, task1 = create_user_project
    another_user_headers, another_user, another_project = create_another_user_and_project

    # Create a task in project1, assigned to user1
    task_in_1 = TaskCreate(title="User1 Task", project_id=project1.id, assignee_id=user1.id)
    task_user1_assigned_user1 = await crud_task.create(db_session, obj_in=task_in_1)

    # Try to access task_user1_assigned_user1 with another_user_headers
    r = await client.get(f"{settings.API_V1_STR}/tasks/{task_user1_assigned_user1.id}", headers=another_user_headers)
    assert r.status_code == 403
    assert "not authorized to view this task" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_update_task_by_project_owner(client: AsyncClient, create_user_project, db_session: AsyncSession):
    """Test updating a task by the project owner."""
    headers, user, project, task = create_user_project
    
    # Create another user to assign the task to
    assignee_user_in = UserCreate(username="assignee_user", email="assignee@example.com", password="password")
    assignee_user = await crud_user.create(db_session, obj_in=assignee_user_in)

    update_data = {
        "title": "Updated Task Title",
        "status": "in-progress",
        "assignee_id": str(assignee_user.id) # Reassign task
    }
    r = await client.put(f"{settings.API_V1_STR}/tasks/{task.id}", headers=headers, json=update_data)
    assert r.status_code == 200
    updated_task = r.json()
    assert updated_task["title"] == update_data["title"]
    assert updated_task["status"] == update_data["status"]
    assert updated_task["assignee_id"] == str(assignee_user.id)

@pytest.mark.asyncio
async def test_update_task_by_assignee(client: AsyncClient, create_user_project, db_session: AsyncSession):
    """Test updating task status and description by the assignee."""
    headers, user, project, task = create_user_project # user is both owner and assignee
    
    # Create another project for the same user, and a task assigned to them
    project_in_2 = ProjectCreate(name="Another Project for Assignee", description="Desc.")
    project2 = await crud_project.create_with_owner(db_session, obj_in=project_in_2, owner_id=user.id)
    task_in_2 = TaskCreate(title="Task Assigned to User", project_id=project2.id, assignee_id=user.id)
    task2 = await crud_task.create(db_session, obj_in=task_in_2)

    update_data = {
        "status": "completed",
        "description": "Completed this task finally!",
    }
    r = await client.put(f"{settings.API_V1_STR}/tasks/{task2.id}", headers=headers, json=update_data)
    assert r.status_code == 200
    updated_task = r.json()
    assert updated_task["status"] == update_data["status"]
    assert updated_task["description"] == update_data["description"]
    assert updated_task["title"] == task2.title # Should not be changed by assignee

@pytest.mark.asyncio
async def test_update_task_by_assignee_forbidden_fields(client: AsyncClient, create_user_project, db_session: AsyncSession):
    """Test assignee cannot update forbidden fields like title or project_id."""
    headers, user, project, task = create_user_project # user is both owner and assignee

    # Now simulate another user as assignee
    assignee_user_in = UserCreate(username="only_assignee", email="only_assignee@example.com", password="password")
    assignee_user = await crud_user.create(db_session, obj_in=assignee_user_in)
    login_data = {"username": assignee_user.email, "password": "password"}
    r_login = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assignee_headers = {"Authorization": f"Bearer {r_login.json()['access_token']}"}

    # Reassign the task to only_assignee (as original project owner)
    await crud_task.update(db_session, db_obj=task, obj_in={"assignee_id": assignee_user.id})

    # Now, as assignee_headers, try to update title
    update_data_title = {"title": "Assignee Attempted Title Change"}
    r_title = await client.put(f"{settings.API_V1_STR}/tasks/{task.id}", headers=assignee_headers, json=update_data_title)
    assert r_title.status_code == 403
    assert "assignees can only update task status and description" in r_title.json()["detail"].lower()

    # As assignee_headers, try to update project_id
    update_data_project = {"project_id": str(UUID("00000000-0000-4000-8000-000000000002"))} # Dummy ID
    r_project = await client.put(f"{settings.API_V1_STR}/tasks/{task.id}", headers=assignee_headers, json=update_data_project)
    assert r_project.status_code == 403
    assert "assignees cannot change the project of a task" in r_project.json()["detail"].lower()

@pytest.mark.asyncio
async def test_update_task_unauthorized(client: AsyncClient, create_another_user_and_project, create_user_project, db_session: AsyncSession):
    """Test updating a task by a user who is neither owner nor assignee."""
    headers_user1, user1, project1, task1 = create_user_project
    another_user_headers, another_user, another_project = create_another_user_and_project

    # Create a task in project1, assigned to user1
    task_in_1 = TaskCreate(title="User1 Task", project_id=project1.id, assignee_id=user1.id)
    task_user1_assigned_user1 = await crud_task.create(db_session, obj_in=task_in_1)

    update_data = {"status": "completed"} # Attempt to update
    r = await client.put(f"{settings.API_V1_STR}/tasks/{task_user1_assigned_user1.id}", headers=another_user_headers, json=update_data)
    assert r.status_code == 403
    assert "not authorized to update this task" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient, create_user_project, db_session: AsyncSession):
    """Test deleting an existing task by project owner."""
    headers, _, _, task = create_user_project
    r = await client.delete(f"{settings.API_V1_STR}/tasks/{task.id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["message"] == "Task deleted successfully"

    # Verify task is deleted from DB
    db_task = await crud_task.get(db_session, id=task.id)
    assert db_task is None

@pytest.mark.asyncio
async def test_delete_task_unauthorized_assignee(client: AsyncClient, create_user_project, db_session: AsyncSession):
    """Test assignee cannot delete a task."""
    headers, user, project, task = create_user_project
    # Simulate user being only assignee, not project owner for this specific task
    project_owner_in = UserCreate(username="real_owner", email="real_owner@example.com", password="password", is_superuser=False)
    project_owner = await crud_user.create(db_session, obj_in=project_owner_in)

    project_in = ProjectCreate(name="Owned by Real Owner", description="Desc.")
    project_owned_by_real_owner = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=project_owner.id)

    task_assigned_to_user = TaskCreate(title="Assigned to User", project_id=project_owned_by_real_owner.id, assignee_id=user.id)
    assigned_task = await crud_task.create(db_session, obj_in=task_assigned_to_user)

    r = await client.delete(f"{settings.API_V1_STR}/tasks/{assigned_task.id}", headers=headers)
    assert r.status_code == 403
    assert "not authorized to delete this task" in r.json()["detail"].lower()
```