import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.project import project as crud_project
from app.schemas.project import ProjectCreate, ProjectUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

@pytest.fixture
async def create_user_project(regular_user_token_headers, db_session: AsyncSession):
    """Fixture to create a project for a regular user."""
    headers, user = regular_user_token_headers
    project_in = ProjectCreate(name="My First Project", description="Description for my first project.")
    project = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=user.id)
    return headers, user, project

@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, regular_user_token_headers):
    """Test creating a new project."""
    headers, user = regular_user_token_headers
    project_data = {"name": "New Project", "description": "This is a new project description."}
    r = await client.post(f"{settings.API_V1_STR}/projects/", headers=headers, json=project_data)
    assert r.status_code == 201
    created_project = r.json()
    assert created_project["name"] == project_data["name"]
    assert created_project["owner_id"] == str(user.id)
    assert "id" in created_project

@pytest.mark.asyncio
async def test_read_projects(client: AsyncClient, create_user_project):
    """Test retrieving projects for the current user."""
    headers, user, project = create_user_project
    r = await client.get(f"{settings.API_V1_STR}/projects/", headers=headers)
    assert r.status_code == 200
    projects = r.json()
    assert isinstance(projects, list)
    assert len(projects) == 1
    assert projects[0]["id"] == str(project.id)
    assert projects[0]["name"] == project.name

@pytest.mark.asyncio
async def test_read_project_by_id(client: AsyncClient, create_user_project):
    """Test retrieving a single project by ID."""
    headers, _, project = create_user_project
    r = await client.get(f"{settings.API_V1_STR}/projects/{project.id}", headers=headers)
    assert r.status_code == 200
    retrieved_project = r.json()
    assert retrieved_project["id"] == str(project.id)
    assert retrieved_project["name"] == project.name

@pytest.mark.asyncio
async def test_read_non_existent_project(client: AsyncClient, regular_user_token_headers):
    """Test retrieving a non-existent project."""
    headers, _ = regular_user_token_headers
    non_existent_id = UUID("00000000-0000-4000-8000-000000000001")
    r = await client.get(f"{settings.API_V1_STR}/projects/{non_existent_id}", headers=headers)
    assert r.status_code == 404
    assert "project not found" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_read_project_unauthorized(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test reading a project owned by another user."""
    headers_owner_1, user_1 = regular_user_token_headers
    project_in = ProjectCreate(name="User1 Project", description="Project by user 1.")
    project_user_1 = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=user_1.id)

    # Create another user and get their token
    user_in_2 = UserCreate(username="user2", email="user2@example.com", password="password")
    user_2 = await crud_user.create(db_session, obj_in=user_in_2)
    login_data_2 = {"username": user_2.email, "password": "password"}
    r_login_2 = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data_2)
    headers_user_2 = {"Authorization": f"Bearer {r_login_2.json()['access_token']}"}

    r = await client.get(f"{settings.API_V1_STR}/projects/{project_user_1.id}", headers=headers_user_2)
    assert r.status_code == 403
    assert "not authorized" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, create_user_project):
    """Test updating an existing project."""
    headers, _, project = create_user_project
    update_data = {"name": "Updated Project Name", "description": "New description for the project."}
    r = await client.put(f"{settings.API_V1_STR}/projects/{project.id}", headers=headers, json=update_data)
    assert r.status_code == 200
    updated_project = r.json()
    assert updated_project["id"] == str(project.id)
    assert updated_project["name"] == update_data["name"]
    assert updated_project["description"] == update_data["description"]

@pytest.mark.asyncio
async def test_update_project_unauthorized(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test updating a project owned by another user."""
    headers_owner_1, user_1 = regular_user_token_headers
    project_in = ProjectCreate(name="User1 Project", description="Project by user 1.")
    project_user_1 = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=user_1.id)

    user_in_2 = UserCreate(username="user2_update", email="user2_update@example.com", password="password")
    user_2 = await crud_user.create(db_session, obj_in=user_in_2)
    login_data_2 = {"username": user_2.email, "password": "password"}
    r_login_2 = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data_2)
    headers_user_2 = {"Authorization": f"Bearer {r_login_2.json()['access_token']}"}

    update_data = {"name": "Attempted update"}
    r = await client.put(f"{settings.API_V1_STR}/projects/{project_user_1.id}", headers=headers_user_2, json=update_data)
    assert r.status_code == 403
    assert "not authorized" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, create_user_project, db_session: AsyncSession):
    """Test deleting an existing project."""
    headers, _, project = create_user_project
    r = await client.delete(f"{settings.API_V1_STR}/projects/{project.id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["message"] == "Project deleted successfully"

    # Verify project is deleted from DB
    db_project = await crud_project.get(db_session, id=project.id)
    assert db_project is None

@pytest.mark.asyncio
async def test_delete_project_unauthorized(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test deleting a project owned by another user."""
    headers_owner_1, user_1 = regular_user_token_headers
    project_in = ProjectCreate(name="User1 Project", description="Project by user 1.")
    project_user_1 = await crud_project.create_with_owner(db_session, obj_in=project_in, owner_id=user_1.id)

    user_in_2 = UserCreate(username="user2_delete", email="user2_delete@example.com", password="password")
    user_2 = await crud_user.create(db_session, obj_in=user_in_2)
    login_data_2 = {"username": user_2.email, "password": "password"}
    r_login_2 = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data_2)
    headers_user_2 = {"Authorization": f"Bearer {r_login_2.json()['access_token']}"}

    r = await client.delete(f"{settings.API_V1_STR}/projects/{project_user_1.id}", headers=headers_user_2)
    assert r.status_code == 403
    assert "not authorized" in r.json()["detail"].lower()
```