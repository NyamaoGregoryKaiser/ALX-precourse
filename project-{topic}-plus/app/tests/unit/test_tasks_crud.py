import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import tasks as crud_tasks
from app.crud import projects as crud_projects
from app.crud import users as crud_users
from app.models.task import TaskCreate, TaskUpdate
from app.models.project import ProjectCreate
from app.models.user import UserCreate
from app.schemas.task import Task as DBTask, TaskStatus
from app.schemas.project import ProjectStatus
from app.schemas.user import UserRole
from app.core.exceptions import NotFoundException
from faker import Faker
import datetime

fake = Faker()

@pytest.mark.asyncio
async def test_create_task(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)
    assignee = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    task_in = TaskCreate(
        title=fake.sentence(nb_words=5),
        description=fake.paragraph(nb_sentences=2),
        status=TaskStatus.TO_DO,
        priority=1,
        project_id=project.id,
        assignee_id=assignee.id,
        due_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    )
    task = await crud_tasks.create_task(db_session, task_in)

    assert task.id is not None
    assert task.title == task_in.title
    assert task.project_id == project.id
    assert task.assignee_id == assignee.id
    assert task.status == TaskStatus.TO_DO
    assert task.project.id == project.id # Check relationship loading
    assert task.assignee.id == assignee.id # Check relationship loading
    assert task.is_completed is False

@pytest.mark.asyncio
async def test_create_task_no_assignee(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)

    task_in = TaskCreate(title="Task without Assignee", project_id=project.id)
    task = await crud_tasks.create_task(db_session, task_in)

    assert task.id is not None
    assert task.assignee_id is None
    assert task.assignee is None

@pytest.mark.asyncio
async def test_create_task_project_not_found(db_session: AsyncSession):
    task_in = TaskCreate(title="Invalid Task", project_id=999)
    with pytest.raises(NotFoundException, match="Project with ID 999 not found"):
        await crud_tasks.create_task(db_session, task_in)

@pytest.mark.asyncio
async def test_create_task_assignee_not_found(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)

    task_in = TaskCreate(title="Invalid Assignee Task", project_id=project.id, assignee_id=999)
    with pytest.raises(NotFoundException, match="Assignee with ID 999 not found"):
        await crud_tasks.create_task(db_session, task_in)


@pytest.mark.asyncio
async def test_get_task_by_id(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)
    task_in = TaskCreate(title="Fetchable Task", project_id=project.id)
    created_task = await crud_tasks.create_task(db_session, task_in)

    fetched_task = await crud_tasks.get_task_by_id(db_session, created_task.id)
    assert fetched_task is not None
    assert fetched_task.id == created_task.id
    assert fetched_task.title == created_task.title
    assert fetched_task.project.id == project.id
    assert fetched_task.project.owner.id == owner.id

@pytest.mark.asyncio
async def test_get_task_by_id_not_found(db_session: AsyncSession):
    task = await crud_tasks.get_task_by_id(db_session, 999)
    assert task is None

@pytest.mark.asyncio
async def test_get_tasks_no_filters(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project_1 = await crud_projects.create_project(db_session, ProjectCreate(title="Project A"), owner.id)
    project_2 = await crud_projects.create_project(db_session, ProjectCreate(title="Project B"), owner.id)

    await crud_tasks.create_task(db_session, TaskCreate(title="Task 1", project_id=project_1.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="Task 2", project_id=project_2.id))

    tasks = await crud_tasks.get_tasks(db_session)
    assert len(tasks) >= 2

@pytest.mark.asyncio
async def test_get_tasks_filter_by_project(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project_1 = await crud_projects.create_project(db_session, ProjectCreate(title="Project for Tasks"), owner.id)
    project_2 = await crud_projects.create_project(db_session, ProjectCreate(title="Another Project"), owner.id)

    await crud_tasks.create_task(db_session, TaskCreate(title="Task 1", project_id=project_1.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="Task 2", project_id=project_2.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="Task 3", project_id=project_1.id))

    tasks_in_project_1 = await crud_tasks.get_tasks(db_session, project_id=project_1.id)
    assert len(tasks_in_project_1) == 2
    for t in tasks_in_project_1:
        assert t.project_id == project_1.id

@pytest.mark.asyncio
async def test_get_tasks_filter_by_assignee(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title="Project for Assignee Tasks"), owner.id)
    assignee_1 = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    assignee_2 = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))

    await crud_tasks.create_task(db_session, TaskCreate(title="Task for Assignee 1", project_id=project.id, assignee_id=assignee_1.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="Task for Assignee 2", project_id=project.id, assignee_id=assignee_2.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="Another Task for Assignee 1", project_id=project.id, assignee_id=assignee_1.id))

    tasks_for_assignee_1 = await crud_tasks.get_tasks(db_session, assignee_id=assignee_1.id)
    assert len(tasks_for_assignee_1) == 2
    for t in tasks_for_assignee_1:
        assert t.assignee_id == assignee_1.id

@pytest.mark.asyncio
async def test_get_tasks_filter_by_status_and_completion(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title="Project for Status Tasks"), owner.id)

    await crud_tasks.create_task(db_session, TaskCreate(title="Done Task 1", project_id=project.id, status=TaskStatus.DONE, is_completed=True))
    await crud_tasks.create_task(db_session, TaskCreate(title="In Progress Task 1", project_id=project.id, status=TaskStatus.IN_PROGRESS, is_completed=False))
    await crud_tasks.create_task(db_session, TaskCreate(title="Done Task 2", project_id=project.id, status=TaskStatus.DONE, is_completed=True))
    await crud_tasks.create_task(db_session, TaskCreate(title="To Do Task 1", project_id=project.id, status=TaskStatus.TO_DO, is_completed=False))

    done_tasks = await crud_tasks.get_tasks(db_session, status=TaskStatus.DONE, is_completed=True)
    assert len(done_tasks) == 2
    for t in done_tasks:
        assert t.status == TaskStatus.DONE
        assert t.is_completed is True

    incomplete_tasks = await crud_tasks.get_tasks(db_session, is_completed=False)
    assert len(incomplete_tasks) == 2 # In Progress and To Do

@pytest.mark.asyncio
async def test_get_tasks_filter_by_search(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title="Project for Search"), owner.id)

    await crud_tasks.create_task(db_session, TaskCreate(title="Frontend Bug Fix", description="Fixing a bug on the frontend.", project_id=project.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="Backend Feature", description="Implement a new API endpoint.", project_id=project.id))
    await crud_tasks.create_task(db_session, TaskCreate(title="UI/UX Improvement", description="Improve the user interface.", project_id=project.id))

    search_results = await crud_tasks.get_tasks(db_session, search="front")
    assert len(search_results) == 2 # "Frontend Bug Fix" (title), "UI/UX Improvement" (description)
    assert "Frontend Bug Fix" in [t.title for t in search_results]
    assert "UI/UX Improvement" in [t.title for t in search_results]

@pytest.mark.asyncio
async def test_update_task(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)
    task_in = TaskCreate(title="Task to Update", project_id=project.id, status=TaskStatus.TO_DO)
    created_task = await crud_tasks.create_task(db_session, task_in)

    new_title = "Updated Task Title"
    new_description = "Updated description content."
    task_update = TaskUpdate(title=new_title, description=new_description, status=TaskStatus.IN_PROGRESS, priority=2)
    updated_task = await crud_tasks.update_task(db_session, created_task.id, task_update)

    assert updated_task.title == new_title
    assert updated_task.description == new_description
    assert updated_task.status == TaskStatus.IN_PROGRESS
    assert updated_task.priority == 2
    assert updated_task.is_completed is False # Not DONE yet

@pytest.mark.asyncio
async def test_update_task_set_assignee_to_none(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title="Test Project"), owner.id)
    assignee = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    task_in = TaskCreate(title="Assigned Task", project_id=project.id, assignee_id=assignee.id)
    created_task = await crud_tasks.create_task(db_session, task_in)

    task_update = TaskUpdate(assignee_id=None)
    updated_task = await crud_tasks.update_task(db_session, created_task.id, task_update)

    assert updated_task.assignee_id is None
    assert updated_task.assignee is None

@pytest.mark.asyncio
async def test_update_task_status_to_done(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title="Test Project"), owner.id)
    task_in = TaskCreate(title="Task to Complete", project_id=project.id, status=TaskStatus.TO_DO, is_completed=False)
    created_task = await crud_tasks.create_task(db_session, task_in)

    task_update = TaskUpdate(status=TaskStatus.DONE)
    updated_task = await crud_tasks.update_task(db_session, created_task.id, task_update)

    assert updated_task.status == TaskStatus.DONE
    assert updated_task.is_completed is True

@pytest.mark.asyncio
async def test_update_task_status_from_done_uncompletes(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title="Test Project"), owner.id)
    task_in = TaskCreate(title="Completed Task", project_id=project.id, status=TaskStatus.DONE, is_completed=True)
    created_task = await crud_tasks.create_task(db_session, task_in)

    task_update = TaskUpdate(status=TaskStatus.IN_PROGRESS)
    updated_task = await crud_tasks.update_task(db_session, created_task.id, task_update)

    assert updated_task.status == TaskStatus.IN_PROGRESS
    assert updated_task.is_completed is False

@pytest.mark.asyncio
async def test_update_task_not_found(db_session: AsyncSession):
    task_update = TaskUpdate(title="Nonexistent Task")
    with pytest.raises(NotFoundException, match="Task not found"):
        await crud_tasks.update_task(db_session, 999, task_update)

@pytest.mark.asyncio
async def test_update_task_assignee_not_found(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)
    task_in = TaskCreate(title="Task with Invalid Assignee", project_id=project.id)
    created_task = await crud_tasks.create_task(db_session, task_in)

    task_update = TaskUpdate(assignee_id=999)
    with pytest.raises(NotFoundException, match="Assignee with ID 999 not found"):
        await crud_tasks.update_task(db_session, created_task.id, task_update)


@pytest.mark.asyncio
async def test_delete_task(db_session: AsyncSession):
    owner = await crud_users.create_user(db_session, UserCreate(username=fake.user_name(), email=fake.email(), password=fake.password()))
    project = await crud_projects.create_project(db_session, ProjectCreate(title=fake.sentence(nb_words=3)), owner.id)
    task_in = TaskCreate(title="Task to Delete", project_id=project.id)
    created_task = await crud_tasks.create_task(db_session, task_in)

    success = await crud_tasks.delete_task(db_session, created_task.id)
    assert success is True

    deleted_task = await crud_tasks.get_task_by_id(db_session, created_task.id)
    assert deleted_task is None

@pytest.mark.asyncio
async def test_delete_task_not_found(db_session: AsyncSession):
    with pytest.raises(NotFoundException, match="Task not found"):
        await crud_tasks.delete_task(db_session, 999)
```