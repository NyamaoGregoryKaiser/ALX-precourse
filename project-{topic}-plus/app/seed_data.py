import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, check_db_connection, engine, Base
from app.core.security import get_password_hash
from app.schemas.user import User as DBUser, UserRole
from app.schemas.project import Project as DBProject, ProjectStatus
from app.schemas.task import Task as DBTask, TaskStatus
from faker import Faker
import datetime
from loguru import logger

fake = Faker()

async def create_initial_data(db: AsyncSession):
    """
    Creates initial seed data for the database.
    Includes admin, manager, member users, projects, and tasks.
    """
    logger.info("Starting database seeding...")

    # --- Create Users ---
    logger.info("Creating users...")
    admin_user = DBUser(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass"),
        full_name="Admin User",
        is_active=True,
        role=UserRole.ADMIN
    )
    manager_user = DBUser(
        username="manager",
        email="manager@example.com",
        hashed_password=get_password_hash("managerpass"),
        full_name="Manager User",
        is_active=True,
        role=UserRole.MANAGER
    )
    member_user_1 = DBUser(
        username="member1",
        email="member1@example.com",
        hashed_password=get_password_hash("memberpass"),
        full_name="Member One",
        is_active=True,
        role=UserRole.MEMBER
    )
    member_user_2 = DBUser(
        username="member2",
        email="member2@example.com",
        hashed_password=get_password_hash("memberpass"),
        full_name="Member Two",
        is_active=True,
        role=UserRole.MEMBER
    )

    db.add_all([admin_user, manager_user, member_user_1, member_user_2])
    await db.commit()
    await db.refresh(admin_user)
    await db.refresh(manager_user)
    await db.refresh(member_user_1)
    await db.refresh(member_user_2)
    logger.info("Users created.")

    users = [admin_user, manager_user, member_user_1, member_user_2]

    # --- Create Projects ---
    logger.info("Creating projects...")
    projects = []
    project_titles = ["Website Redesign", "Mobile App Development", "API Backend Refactor", "Marketing Campaign Launch", "Internal Tooling"]
    for i, title in enumerate(project_titles):
        owner = users[i % len(users)] # Distribute ownership
        project = DBProject(
            title=title,
            description=fake.paragraph(nb_sentences=3),
            status=fake.random_element(elements=list(ProjectStatus)),
            owner_id=owner.id,
            created_at=fake.past_datetime(start_date='-60d', tzinfo=datetime.timezone.utc),
            updated_at=fake.past_datetime(start_date='-30d', tzinfo=datetime.timezone.utc)
        )
        projects.append(project)
    
    db.add_all(projects)
    await db.commit()
    for p in projects:
        await db.refresh(p)
    logger.info("Projects created.")

    # --- Create Tasks ---
    logger.info("Creating tasks...")
    tasks = []
    for _ in range(30): # Create 30 tasks
        project = fake.random_element(elements=projects)
        assignee = fake.random_element(elements=users + [None]) # Assignee can be None
        
        # Ensure assignee is not an admin for certain tasks if desired, or ensure role is consistent
        # For this example, any user can be an assignee.

        task_status = fake.random_element(elements=list(TaskStatus))
        is_completed = True if task_status == TaskStatus.DONE else False
        
        due_date = fake.future_datetime(end_date='+30d', tzinfo=datetime.timezone.utc) if fake.boolean() else None

        task = DBTask(
            title=fake.sentence(nb_words=5).strip('.'),
            description=fake.paragraph(nb_sentences=2),
            status=task_status,
            priority=fake.random_int(min=1, max=5),
            project_id=project.id,
            assignee_id=assignee.id if assignee else None,
            due_date=due_date,
            is_completed=is_completed,
            created_at=fake.past_datetime(start_date='-20d', tzinfo=datetime.timezone.utc),
            updated_at=fake.past_datetime(start_date='-5d', tzinfo=datetime.timezone.utc)
        )
        tasks.append(task)
    
    db.add_all(tasks)
    await db.commit()
    for t in tasks:
        await db.refresh(t)
    logger.info("Tasks created.")

    logger.info("Database seeding complete.")

async def main():
    """Main function to run the seeding process."""
    from app.core.config import settings
    logger.info(f"Using database: {settings.ASYNC_DATABASE_URL}")
    
    try:
        await check_db_connection()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all) # Clear existing tables for fresh seed
            await conn.run_sync(Base.metadata.create_all) # Create tables
        logger.info("Database tables dropped and recreated.")
        
        async with AsyncSessionLocal() as db:
            await create_initial_data(db)
    except Exception as e:
        logger.error(f"An error occurred during seeding: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Load environment variables for local execution
    from dotenv import load_dotenv
    load_dotenv()
    
    # Configure logging for the script
    from app.core.logging_config import setup_logging
    setup_logging()

    asyncio.run(main())
```