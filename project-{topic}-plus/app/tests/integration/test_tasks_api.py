import pytest
from httpx import AsyncClient
from app.schemas.task import TaskStatus
from app.schemas.user import UserRole
from faker import Faker

fake = Faker()

@pytest.mark.asyncio
async def test_create_task_as_project_owner(client: AsyncClient, member_user, member_auth_headers: dict, create_test_project):
    project = await create_test_project(owner=member_user)
    task_data = {
        "title": fake.sentence(nb_words=5),
        "description": fake.paragraph(nb_sentences=2),
        "project_id": project.id,
        "status": TaskStatus.TO_DO.value
    }
    response = await client.post("/api/v1/tasks/", json=task_data, headers=member_auth_headers)
    assert response.status_code == 201
    created_task = response.json()
    assert created_task["title"] == task_data["title"]
    assert created_task["project_id"] == project.id
    assert created_task["project"]["title"] == project.title

@pytest.mark.asyncio
async def test_create_task_as_non_owner_member_forbidden(client: AsyncClient, member_auth_headers: dict, admin_user, create_test_project):
    project = await create_test_project(owner=admin_user) # Owned by admin, not member
    task_data = {
        "title": fake.sentence(nb_words=5),
        "project_id": project.id,
    }
    response = await client.post("/api/v1/tasks/", json=task_data, headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_read_tasks_as_manager(client: AsyncClient, manager_auth_headers: dict, create_test_project, create_test_task, admin_user, manager_user):
    admin_project = await create_test_project(owner=admin_user)
    manager_project = await create_test_project(owner=manager_user)
    await create_test_task(title="Admin Project Task", project=admin_project)
    await create_test_task(title="Manager Project Task", project=manager_project)

    response = await client.get("/api/v1/tasks/", headers=manager_auth_headers)
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)
    assert any(t["project"]["owner"]["id"] == admin_user.id for t in tasks)
    assert any(t["project"]["owner"]["id"] == manager_user.id for t in tasks)

@pytest.mark.asyncio
async def test_read_tasks_as_member_only_assigned_or_owned_project(client: AsyncClient, member_auth_headers: dict, member_user, create_test_user, create_test_project, create_test_task):
    member_owned_project = await create_test_project(owner=member_user)
    admin_owned_project = await create_test_project(owner=await create_test_user(username="temp_admin", email="temp_admin@example.com", role=UserRole.ADMIN))

    task_in_member_owned = await create_test_task(title="Task in Member's Project", project=member_owned_project)
    task_assigned_to_member = await create_test_task(title="Task Assigned to Member", project=admin_owned_project, assignee=member_user)
    task_not_accessible = await create_test_task(title="Task Not Accessible", project=admin_owned_project) # Neither owner nor assignee

    response = await client.get("/api/v1/tasks/", headers=member_auth_headers)
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 2 # Should only see the two accessible tasks
    assert any(t["id"] == task_in_member_owned.id for t in tasks)
    assert any(t["id"] == task_assigned_to_member.id for t in tasks)
    assert not any(t["id"] == task_not_accessible.id for t in tasks)

@pytest.mark.asyncio
async def test_read_task_by_id_as_assignee(client: AsyncClient, member_auth_headers: dict, member_user, create_test_project, create_test_task):
    admin_project_owner = await create_test_user(username="admin_p_owner", email="admin_p_owner@example.com", role=UserRole.ADMIN)
    project = await create_test_project(owner=admin_project_owner)
    task = await create_test_task(project=project, assignee=member_user) # Member is assignee
    
    response = await client.get(f"/api/v1/tasks/{task.id}", headers=member_auth_headers)
    assert response.status_code == 200
    fetched_task = response.json()
    assert fetched_task["id"] == task.id
    assert fetched_task["assignee"]["id"] == member_user.id

@pytest.mark.asyncio
async def test_read_task_by_id_as_non_assignee_member_forbidden(client: AsyncClient, member_auth_headers: dict, admin_user, create_test_project, create_test_task):
    project = await create_test_project(owner=admin_user)
    task = await create_test_task(project=project) # No assignee
    response = await client.get(f"/api/v1/tasks/{task.id}", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_update_task_as_project_owner(client: AsyncClient, member_user, member_auth_headers: dict, create_test_project, create_test_task):
    project = await create_test_project(owner=member_user)
    task = await create_test_task(project=project, status=TaskStatus.TO_DO)
    
    new_title = "Owner Updated Task Title"
    update_data = {"title": new_title, "status": TaskStatus.IN_PROGRESS.value, "is_completed": True}
    response = await client.put(f"/api/v1/tasks/{task.id}", json=update_data, headers=member_auth_headers)
    assert response.status_code == 200
    updated_task = response.json()
    assert updated_task["title"] == new_title
    assert updated_task["status"] == TaskStatus.IN_PROGRESS.value
    assert updated_task["is_completed"] is True # Owner can explicitly set

@pytest.mark.asyncio
async def test_update_task_as_assignee_limited_fields(client: AsyncClient, member_user, member_auth_headers: dict, create_test_project, create_test_task, admin_user):
    project = await create_test_project(owner=admin_user)
    task = await create_test_task(project=project, assignee=member_user, status=TaskStatus.TO_DO)
    
    # Assignee can update status and description
    update_data = {"status": TaskStatus.DONE.value, "description": "Assignee completed this task."}
    response = await client.put(f"/api/v1/tasks/{task.id}", json=update_data, headers=member_auth_headers)
    assert response.status_code == 200
    updated_task = response.json()
    assert updated_task["status"] == TaskStatus.DONE.value
    assert updated_task["description"] == "Assignee completed this task."
    assert updated_task["is_completed"] is True # Auto-set by crud

    # Assignee cannot update title or priority
    update_data_forbidden = {"title": "Forbidden Title", "priority": 5}
    response_forbidden = await client.put(f"/api/v1/tasks/{task.id}", json=update_data_forbidden, headers=member_auth_headers)
    assert response_forbidden.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_delete_task_as_project_owner(client: AsyncClient, member_user, member_auth_headers: dict, create_test_project, create_test_task):
    project = await create_test_project(owner=member_user)
    task_to_delete = await create_test_task(project=project)
    
    response = await client.delete(f"/api/v1/tasks/{task_to_delete.id}", headers=member_auth_headers)
    assert response.status_code == 204

    response = await client.get(f"/api/v1/tasks/{task_to_delete.id}", headers=member_auth_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_delete_task_as_assignee_forbidden(client: AsyncClient, member_user, member_auth_headers: dict, create_test_project, create_test_task, admin_user):
    project = await create_test_project(owner=admin_user)
    task = await create_test_task(project=project, assignee=member_user) # Member is assignee
    
    response = await client.delete(f"/api/v1/tasks/{task.id}", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden
```