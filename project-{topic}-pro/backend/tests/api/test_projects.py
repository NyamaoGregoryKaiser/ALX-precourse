```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users import UserRole
from app.models.projects import Project
from app.schemas.projects import ProjectCreate, ProjectUpdate

@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, db_session: AsyncSession, team_lead_user, team_lead_token, test_team):
    project_data = ProjectCreate(name="New Project", description="A brand new project.", team_id=test_team.id)
    headers = {"Authorization": f"Bearer {team_lead_token}"}
    response = await client.post("/api/v1/projects/", json=project_data.model_dump(), headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Project"
    assert data["description"] == "A brand new project."
    assert data["team_id"] == test_team.id
    assert data["creator_id"] == team_lead_user.id

    # Verify project is in DB
    project = await db_session.get(Project, data["id"])
    assert project is not None
    assert project.name == "New Project"

@pytest.mark.asyncio
async def test_get_projects(client: AsyncClient, team_lead_token, test_project):
    headers = {"Authorization": f"Bearer {team_lead_token}"}
    response = await client.get("/api/v1/projects/", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(p["id"] == test_project.id for p in data)

@pytest.mark.asyncio
async def test_get_project_by_id(client: AsyncClient, team_lead_token, test_project):
    headers = {"Authorization": f"Bearer {team_lead_token}"}
    response = await client.get(f"/api/v1/projects/{test_project.id}", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_project.id
    assert data["name"] == test_project.name

@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, db_session: AsyncSession, team_lead_token, test_project):
    update_data = ProjectUpdate(name="Updated Project Name", description="Updated description.")
    headers = {"Authorization": f"Bearer {team_lead_token}"}
    response = await client.put(f"/api/v1/projects/{test_project.id}", json=update_data.model_dump(exclude_unset=True), headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_project.id
    assert data["name"] == "Updated Project Name"
    assert data["description"] == "Updated description."

    # Verify project is updated in DB
    updated_project = await db_session.get(Project, test_project.id)
    assert updated_project.name == "Updated Project Name"

@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient, db_session: AsyncSession, team_lead_token, create_project, test_team, team_lead_user):
    project_to_delete = await create_project("Project to Delete", test_team, team_lead_user)
    headers = {"Authorization": f"Bearer {team_lead_token}"}
    response = await client.delete(f"/api/v1/projects/{project_to_delete.id}", headers=headers)

    assert response.status_code == 204 # No content

    # Verify project is deleted from DB
    deleted_project = await db_session.get(Project, project_to_delete.id)
    assert deleted_project is None

@pytest.mark.asyncio
async def test_create_project_forbidden_for_member(client: AsyncClient, member_token, test_team, member_user):
    project_data = ProjectCreate(name="Forbidden Project", description="Should not be created.", team_id=test_team.id)
    headers = {"Authorization": f"Bearer {member_token}"}
    response = await client.post("/api/v1/projects/", json=project_data.model_dump(), headers=headers)
    assert response.status_code == 403 # Members cannot create projects (based on default policy, adjust if needed)

@pytest.mark.asyncio
async def test_update_project_not_owner(client: AsyncClient, team_lead_token, test_project, create_user, member_token):
    # Create another user and try to update test_project
    other_member = await create_user("other@example.com", "other_member", role=UserRole.MEMBER)
    other_member_token = create_access_token(data={"sub": other_member.email})

    update_data = ProjectUpdate(name="Should Not Update")
    headers = {"Authorization": f"Bearer {other_member_token}"}
    response = await client.put(f"/api/v1/projects/{test_project.id}", json=update_data.model_dump(exclude_unset=True), headers=headers)
    assert response.status_code == 403 # Only creator/admin/team lead of team can update (depending on business logic)
```

**Performance Tests (Locust)**: