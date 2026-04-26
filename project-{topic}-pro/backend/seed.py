```python
import asyncio
from datetime import datetime, timedelta
import random
import os
import sys

# Add backend directory to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, Base
from app.models.users import User, UserRole
from app.models.teams import Team, TeamMember
from app.models.projects import Project
from app.models.tasks import Task, TaskStatus, TaskPriority
from app.models.comments import Comment
from app.security import get_password_hash
from config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

async def seed_data():
    """
    Seeds the database with initial data for development and testing.
    """
    logger.info("Starting database seeding...")

    async with engine.begin() as conn:
        # Drop and create all tables for a clean slate
        # In a real production scenario, you would use Alembic migrations to handle schema changes
        # and not drop tables directly. This is for development seeding only.
        logger.info("Dropping all existing tables...")
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Creating all new tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Create Users
        users_data = [
            {"email": "admin@example.com", "username": "admin", "password": "securepassword", "role": UserRole.ADMIN},
            {"email": "john.doe@example.com", "username": "john_doe", "password": "securepassword", "role": UserRole.TEAM_LEAD},
            {"email": "jane.smith@example.com", "username": "jane_smith", "password": "securepassword", "role": UserRole.MEMBER},
            {"email": "peter.jones@example.com", "username": "peter_jones", "password": "securepassword", "role": UserRole.MEMBER},
        ]
        created_users = {}
        for user_data in users_data:
            hashed_password = get_password_hash(user_data["password"])
            user = User(
                email=user_data["email"],
                username=user_data["username"],
                hashed_password=hashed_password,
                is_active=True,
                role=user_data["role"]
            )
            session.add(user)
            await session.flush() # Flush to get user.id
            created_users[user.username] = user
        await session.commit()
        logger.info(f"Created {len(created_users)} users.")

        admin_user = created_users["admin"]
        john = created_users["john_doe"]
        jane = created_users["jane_smith"]
        peter = created_users["peter_jones"]

        # 2. Create Teams
        team_alpha = Team(name="Team Alpha", description="Core development team.", owner_id=john.id)
        team_beta = Team(name="Team Beta", description="Feature development team.", owner_id=admin_user.id)
        session.add_all([team_alpha, team_beta])
        await session.flush()
        logger.info("Created 2 teams.")

        # 3. Add Team Members
        team_members = [
            TeamMember(team_id=team_alpha.id, user_id=john.id),
            TeamMember(team_id=team_alpha.id, user_id=jane.id),
            TeamMember(team_id=team_beta.id, user_id=admin_user.id),
            TeamMember(team_id=team_beta.id, user_id=peter.id),
        ]
        session.add_all(team_members)
        await session.flush()
        logger.info(f"Added {len(team_members)} team members.")

        # 4. Create Projects
        project_nova = Project(name="Project Nova", description="Develop the new user dashboard.", team_id=team_alpha.id, creator_id=john.id)
        project_phoenix = Project(name="Project Phoenix", description="Refactor authentication module.", team_id=team_beta.id, creator_id=admin_user.id)
        project_ares = Project(name="Project Ares", description="Implement real-time notifications.", team_id=team_alpha.id, creator_id=jane.id)
        session.add_all([project_nova, project_phoenix, project_ares])
        await session.flush()
        logger.info("Created 3 projects.")

        # 5. Create Tasks
        tasks_data = [
            {"title": "Design UI for Dashboard", "project_id": project_nova.id, "assignee_id": jane.id, "creator_id": john.id, "status": TaskStatus.IN_PROGRESS, "priority": TaskPriority.HIGH, "due_date": datetime.utcnow() + timedelta(days=7)},
            {"title": "Implement Dashboard Backend API", "project_id": project_nova.id, "assignee_id": john.id, "creator_id": john.id, "status": TaskStatus.TODO, "priority": TaskPriority.HIGH, "due_date": datetime.utcnow() + timedelta(days=14)},
            {"title": "Write unit tests for Auth", "project_id": project_phoenix.id, "assignee_id": admin_user.id, "creator_id": admin_user.id, "status": TaskStatus.DONE, "priority": TaskPriority.MEDIUM, "completed_at": datetime.utcnow() - timedelta(days=2)},
            {"title": "Deploy staging environment", "project_id": project_phoenix.id, "assignee_id": peter.id, "creator_id": admin_user.id, "status": TaskStatus.TODO, "priority": TaskPriority.CRITICAL, "due_date": datetime.utcnow() + timedelta(days=3)},
            {"title": "Research WebSockets for notifications", "project_id": project_ares.id, "assignee_id": jane.id, "creator_id": jane.id, "status": TaskStatus.IN_PROGRESS, "priority": TaskPriority.MEDIUM, "due_date": datetime.utcnow() + timedelta(days=10)},
            {"title": "Prepare Sprint Planning for Project Nova", "project_id": project_nova.id, "assignee_id": john.id, "creator_id": admin_user.id, "status": TaskStatus.TODO, "priority": TaskPriority.LOW, "due_date": datetime.utcnow() + timedelta(days=1)},
        ]
        created_tasks = []
        for task_data in tasks_data:
            task = Task(**task_data)
            session.add(task)
            await session.flush()
            created_tasks.append(task)
        await session.commit()
        logger.info(f"Created {len(created_tasks)} tasks.")

        # 6. Create Comments
        comments_data = [
            {"content": "Starting work on this today.", "task_id": created_tasks[0].id, "author_id": jane.id},
            {"content": "Looks good, let me know if you need help with the API integration.", "task_id": created_tasks[0].id, "author_id": john.id},
            {"content": "Tests are passing, ready for review.", "task_id": created_tasks[2].id, "author_id": admin_user.id},
            {"content": "Checked the documentation, seems feasible with FastAPI's WebSocket support.", "task_id": created_tasks[4].id, "author_id": jane.id},
        ]
        for comment_data in comments_data:
            comment = Comment(**comment_data)
            session.add(comment)
        await session.commit()
        logger.info(f"Created {len(comments_data)} comments.")

    logger.info("Database seeding completed successfully!")

if __name__ == "__main__":
    # Ensure settings are loaded from .env
    # For standalone script, explicitly load
    if not settings.ASYNC_DATABASE_URL:
        logger.error("ASYNC_DATABASE_URL not set. Please ensure .env is configured.")
        sys.exit(1)
    asyncio.run(seed_data())
```

---

### 3. Configuration & Setup