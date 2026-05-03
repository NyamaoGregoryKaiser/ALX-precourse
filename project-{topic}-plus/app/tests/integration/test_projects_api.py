import pytest
from httpx import AsyncClient
from app.schemas.project import ProjectStatus
from app.schemas.user import UserRole
from faker import Faker

fake = Faker()

@pytest.mark.asyncio
async def test_create_project_as_manager(client: AsyncClient, manager_user, manager_auth_headers: dict):
    project_data = {
        "title": fake.sentence(nb_words=4),
        "description": fake.paragraph(nb_sentences=2),
        "status": ProjectStatus.NOT_STARTED.value
    }
    response = await client.post("/api/v1/projects/", json=project_data, headers=manager_auth_headers)
    assert response.status_code == 201
    created_project = response.json()
    assert created_project["title"] == project_data["title"]
    assert created_project["owner_id"] == manager_user.id
    assert created_project["owner"]["username"] == manager_user.username

@pytest.mark.asyncio
async def test_create_project_as_member_forbidden(client: AsyncClient, member_auth_headers: dict):
    project_data = {
        "title": fake.sentence(nb_words=4),
        "description": fake.paragraph(nb_sentences=2),
        "status": ProjectStatus.NOT_STARTED.value
    }
    response = await client.post("/api/v1/projects/", json=project_data, headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_read_projects_as_manager(client: AsyncClient, manager_auth_headers: dict, create_test_project, admin_user):
    await create_test_project(title="Manager's Project", owner=manager_user)
    await create_test_project(title="Admin's Project", owner=admin_user)

    response = await client.get("/api/v1/projects/", headers=manager_auth_headers)
    assert response.status_code == 200
    projects = response.json()
    assert isinstance(projects, list)
    assert any(p["owner_id"] == manager_user.id for p in projects)
    assert any(p["owner_id"] == admin_user.id for p in projects)

@pytest.mark.asyncio
async def test_read_projects_as_member_only_own_projects(client: AsyncClient, member_auth_headers: dict, member_user, create_test_project, admin_user):
    member_project_1 = await create_test_project(title="Member's Own Project 1", owner=member_user)
    member_project_2 = await create_test_project(title="Member's Own Project 2", owner=member_user)
    admin_project = await create_test_project(title="Admin's Project for Member Test", owner=admin_user)

    response = await client.get("/api/v1/projects/", headers=member_auth_headers)
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) == 2 # Only own projects
    assert all(p["owner_id"] == member_user.id for p in projects)
    assert any(p["id"] == member_project_1.id for p in projects)
    assert any(p["id"] == member_project_2.id for p in projects)
    assert not any(p["id"] == admin_project.id for p in projects)

@pytest.mark.asyncio
async def test_read_projects_as_admin_filter_by_owner(client: AsyncClient, admin_auth_headers: dict, admin_user, create_test_user, create_test_project):
    target_owner = await create_test_user(username="target_owner", email="target@example.com")
    await create_test_project(title="Project for Target Owner 1", owner=target_owner)
    await create_test_project(title="Project for Target Owner 2", owner=target_owner)
    await create_test_project(title="Project for Admin", owner=admin_user)

    response = await client.get(f"/api/v1/projects/?owner_id={target_owner.id}", headers=admin_auth_headers)
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) == 2
    assert all(p["owner_id"] == target_owner.id for p in projects)

@pytest.mark.asyncio
async def test_read_project_by_id_as_owner(client: AsyncClient, member_user, member_auth_headers: dict, create_test_project):
    project = await create_test_project(owner=member_user)
    response = await client.get(f"/api/v1/projects/{project.id}", headers=member_auth_headers)
    assert response.status_code == 200
    fetched_project = response.json()
    assert fetched_project["id"] == project.id
    assert fetched_project["owner_id"] == member_user.id

@pytest.mark.asyncio
async def test_read_project_by_id_as_non_owner_member_forbidden(client: AsyncClient, member_auth_headers: dict, admin_user, create_test_project):
    project = await create_test_project(owner=admin_user)
    response = await client.get(f"/api/v1/projects/{project.id}", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_update_project_as_manager(client: AsyncClient, manager_auth_headers: dict, manager_user, create_test_project):
    project = await create_test_project(owner=manager_user)
    new_title = "Updated Manager Project Title"
    update_data = {"title": new_title, "status": ProjectStatus.COMPLETED.value}
    response = await client.put(f"/api/v1/projects/{project.id}", json=update_data, headers=manager_auth_headers)
    assert response.status_code == 200
    updated_project = response.json()
    assert updated_project["title"] == new_title
    assert updated_project["status"] == ProjectStatus.COMPLETED.value

@pytest.mark.asyncio
async def test_update_project_as_member_forbidden(client: AsyncClient, member_auth_headers: dict, member_user, create_test_project):
    project = await create_test_project(owner=member_user)
    update_data = {"title": "Should not update"}
    response = await client.put(f"/api/v1/projects/{project.id}", json=update_data, headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden (even if they own it, members can't update. Only managers/admins)

@pytest.mark.asyncio
async def test_delete_project_as_admin(client: AsyncClient, admin_auth_headers: dict, create_test_user, create_test_project):
    project_owner = await create_test_user(username="proj_del_owner", email="proj_del_owner@example.com")
    project_to_delete = await create_test_project(owner=project_owner)
    response = await client.delete(f"/api/v1/projects/{project_to_delete.id}", headers=admin_auth_headers)
    assert response.status_code == 204

    response = await client.get(f"/api/v1/projects/{project_to_delete.id}", headers=admin_auth_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_delete_project_as_member_forbidden(client: AsyncClient, member_auth_headers: dict, member_user, create_test_project):
    project = await create_test_project(owner=member_user)
    response = await client.delete(f"/api/v1/projects/{project.id}", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden
```