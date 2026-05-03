import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import projects as crud_projects
from app.crud import users as crud_users
from app.models.project import ProjectCreate, ProjectUpdate
from app.models.user import UserCreate
from app.schemas.project import Project as DBProject, ProjectStatus
from app.schemas.user import User as DBUser, UserRole
from app.core.exceptions import NotFoundException
from faker import Faker

fake = Faker()

@pytest.mark.asyncio
async def test_create_project(db_session: AsyncSession):
    user_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password(), role=UserRole.MANAGER)
    owner = await crud_users.create_user(db_session, user_in)

    project_in = ProjectCreate(
        title=fake.sentence(nb_words=3),
        description=fake.paragraph(nb_sentences=2),
        status=ProjectStatus.IN_PROGRESS
    )
    project = await crud_projects.create_project(db_session, project_in, owner.id)

    assert project.id is not None
    assert project.title == project_in.title
    assert project.owner_id == owner.id
    assert project.owner.id == owner.id # Check relationship loading
    assert project.status == ProjectStatus.IN_PROGRESS

@pytest.mark.asyncio
async def test_get_project_by_id(db_session: AsyncSession):
    user_in = UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password(), role=UserRole.MANAGER)
    owner = await crud_users.create_user(db_session, user_in)

    project_in = ProjectCreate(title=fake.sentence(nb_words=3), owner_id=owner.id)
    created_project = await crud_projects.create_project(db_session, project_in, owner.id)

    fetched_project = await crud_projects.get_project_by_id(db_session, created_project.id)
    assert fetched_project is not None
    assert fetched_project.id == created_project.id
    assert fetched_project.title == created_project.title
    assert fetched_project.owner.id == owner.id

@pytest.mark.asyncio
async def test_get_project_by_id_not_found(db_session: AsyncSession):
    project = await crud_projects.get_project_by_id(db_session, 999)
    assert project is None

@pytest.mark.asyncio
async def test_get_projects_no_filters(db_session: AsyncSession):
    owner_1 = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    owner_2 = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    await crud_projects.create_project(db_session, ProjectCreate(title="Proj A"), owner_1.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Proj B"), owner_2.id)

    projects = await crud_projects.get_projects(db_session)
    assert len(projects) >= 2

@pytest.mark.asyncio
async def test_get_projects_filter_by_owner(db_session: AsyncSession):
    owner_1 = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    owner_2 = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    await crud_projects.create_project(db_session, ProjectCreate(title="Proj C"), owner_1.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Proj D"), owner_2.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Proj E"), owner_1.id)

    projects_by_owner_1 = await crud_projects.get_projects(db_session, owner_id=owner_1.id)
    assert len(projects_by_owner_1) == 2
    for p in projects_by_owner_1:
        assert p.owner_id == owner_1.id

@pytest.mark.asyncio
async def test_get_projects_filter_by_status(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    await crud_projects.create_project(db_session, ProjectCreate(title="Proj F", status=ProjectStatus.COMPLETED), owner.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Proj G", status=ProjectStatus.IN_PROGRESS), owner.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Proj H", status=ProjectStatus.COMPLETED), owner.id)

    completed_projects = await crud_projects.get_projects(db_session, status=ProjectStatus.COMPLETED)
    assert len(completed_projects) == 2
    for p in completed_projects:
        assert p.status == ProjectStatus.COMPLETED

@pytest.mark.asyncio
async def test_get_projects_filter_by_search(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    await crud_projects.create_project(db_session, ProjectCreate(title="Searchable Project Alpha", description="This project is about searching."), owner.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Another Project", description="Not relevant for search."), owner.id)
    await crud_projects.create_project(db_session, ProjectCreate(title="Beta Search", description="Find me."), owner.id)

    search_results = await crud_projects.get_projects(db_session, search="search")
    assert len(search_results) == 2
    assert "Searchable Project Alpha" in [p.title for p in search_results]
    assert "Beta Search" in [p.title for p in search_results]

@pytest.mark.asyncio
async def test_update_project(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project_in = ProjectCreate(title="Original Title", owner_id=owner.id)
    created_project = await crud_projects.create_project(db_session, project_in, owner.id)

    new_title = "Updated Title"
    new_description = "New description content."
    project_update = ProjectUpdate(title=new_title, description=new_description, status=ProjectStatus.COMPLETED)
    updated_project = await crud_projects.update_project(db_session, created_project.id, project_update)

    assert updated_project.title == new_title
    assert updated_project.description == new_description
    assert updated_project.status == ProjectStatus.COMPLETED
    assert updated_project.id == created_project.id

@pytest.mark.asyncio
async def test_update_project_not_found(db_session: AsyncSession):
    project_update = ProjectUpdate(title="Nonexistent Project")
    with pytest.raises(NotFoundException, match="Project not found"):
        await crud_projects.update_project(db_session, 999, project_update)

@pytest.mark.asyncio
async def test_delete_project(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project_in = ProjectCreate(title="Project to Delete", owner_id=owner.id)
    created_project = await crud_projects.create_project(db_session, project_in, owner.id)

    success = await crud_projects.delete_project(db_session, created_project.id)
    assert success is True

    deleted_project = await crud_projects.get_project_by_id(db_session, created_project.id)
    assert deleted_project is None

@pytest.mark.asyncio
async def test_delete_project_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundException, match="Project not found"):
        await crud_projects.delete_project(db_session, 999)
```