```python
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import os
import sys
# Add backend directory to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.database import Base, get_db
from app.main import app
from app.models.users import User, UserRole
from app.security import create_access_token, get_password_hash
from app.models.teams import Team, TeamMember
from app.models.projects import Project
from app.models.tasks import Task, TaskStatus, TaskPriority

# Use a separate test database
TEST_DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/taskdb_test"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Override the get_db dependency to use the test database.
    """
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def event_loop():
    """
    Creates an instance of the default event loop for the session.
    """
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    """
    Sets up and tears down the test database for the entire test session.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a fresh database session for each test function,
    and rolls back changes after the test.
    """
    async with TestingSessionLocal() as session:
        # Begin a transaction
        await session.begin()
        yield session
        # Rollback the transaction after the test
        await session.rollback()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provides an asynchronous test client for FastAPI.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

# --- Test Data Fixtures ---

@pytest.fixture
async def create_user(db_session: AsyncSession):
    async def _create_user(email: str, username: str, password: str = "password", role: UserRole = UserRole.MEMBER):
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            role=role,
            is_active=True
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    return _create_user

@pytest.fixture
async def admin_user(create_user):
    return await create_user("admin_test@example.com", "admin_test", role=UserRole.ADMIN)

@pytest.fixture
async def team_lead_user(create_user):
    return await create_user("lead_test@example.com", "lead_test", role=UserRole.TEAM_LEAD)

@pytest.fixture
async def member_user(create_user):
    return await create_user("member_test@example.com", "member_test", role=UserRole.MEMBER)

@pytest.fixture
async def admin_token(admin_user: User):
    return create_access_token(data={"sub": admin_user.email})

@pytest.fixture
async def team_lead_token(team_lead_user: User):
    return create_access_token(data={"sub": team_lead_user.email})

@pytest.fixture
async def member_token(member_user: User):
    return create_access_token(data={"sub": member_user.email})

@pytest.fixture
async def create_team(db_session: AsyncSession):
    async def _create_team(name: str, owner: User):
        team = Team(name=name, description=f"Description for {name}", owner_id=owner.id)
        db_session.add(team)
        await db_session.commit()
        await db_session.refresh(team)
        # Add owner as a member
        team_member = TeamMember(team_id=team.id, user_id=owner.id)
        db_session.add(team_member)
        await db_session.commit()
        await db_session.refresh(team_member)
        return team
    return _create_team

@pytest.fixture
async def test_team(create_team, team_lead_user):
    return await create_team("Test Team", team_lead_user)

@pytest.fixture
async def create_project(db_session: AsyncSession):
    async def _create_project(name: str, team: Team, creator: User):
        project = Project(name=name, description=f"Description for {name}", team_id=team.id, creator_id=creator.id)
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)
        return project
    return _create_project

@pytest.fixture
async def test_project(create_project, test_team, team_lead_user):
    return await create_project("Test Project", test_team, team_lead_user)

@pytest.fixture
async def create_task(db_session: AsyncSession):
    async def _create_task(title: str, project: Project, creator: User, assignee: User = None):
        task = Task(
            title=title,
            description=f"Description for {title}",
            project_id=project.id,
            creator_id=creator.id,
            assignee_id=assignee.id if assignee else None,
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            due_date=datetime.utcnow() + timedelta(days=7)
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)
        return task
    return _create_task

@pytest.fixture
async def test_task(create_task, test_project, team_lead_user, member_user):
    return await create_task("Test Task 1", test_project, team_lead_user, member_user)
```