import asyncio
from uuid import uuid4
from datetime import date, timedelta
from faker import Faker
from loguru import logger

from app.db.session import AsyncSessionLocal
from app.db.init_db import init_db
from app.crud.user import user as crud_user
from app.crud.project import project as crud_project
from app.crud.task import task as crud_task
from app.schemas.user import UserCreate
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate

fake = Faker()

async def seed_data():
    """Seeds the database with fake data."""
    logger.info("Starting database seeding...")
    async with AsyncSessionLocal() as db:
        await init_db(db) # Ensure superuser exists

        # Create some regular users
        users = []
        for _ in range(5):
            user_in = UserCreate(
                username=fake.user_name(),
                email=fake.email(),
                password="password123", # Replace with dynamic password in real scenario
                is_active=True,
                is_superuser=False,
            )
            try:
                user = await crud_user.create(db, obj_in=user_in)
                users.append(user)
                logger.info(f"Created user: {user.username}")
            except Exception as e:
                logger.warning(f"Could not create user {user_in.username}: {e}")
                # Try to get existing user if creation failed due to unique constraint
                user = await crud_user.get_by_email(db, email=user_in.email)
                if user:
                    users.append(user)


        # Create projects for each user
        projects = []
        for user in users:
            for _ in range(fake.random_int(min=1, max=3)): # 1-3 projects per user
                project_in = ProjectCreate(
                    name=fake.catch_phrase(),
                    description=fake.paragraph(nb_sentences=3),
                )
                project = await crud_project.create_with_owner(
                    db, obj_in=project_in, owner_id=user.id
                )
                projects.append(project)
                logger.info(f"Created project: {project.name} by {user.username}")

        # Create tasks for each project
        tasks_created = 0
        for project in projects:
            num_tasks = fake.random_int(min=3, max=10) # 3-10 tasks per project
            for _ in range(num_tasks):
                # Assign to owner or another random user
                assignee = fake.random_element(elements=users)
                due_date = fake.date_object()
                if fake.boolean(chance_of_getting_true=20): # 20% chance of future date
                    due_date = date.today() + timedelta(days=fake.random_int(min=1, max=30))
                else: # 80% chance of past date or today
                    due_date = date.today() - timedelta(days=fake.random_int(min=0, max=30))

                task_in = TaskCreate(
                    project_id=project.id,
                    title=fake.sentence(nb_words=6),
                    description=fake.paragraph(nb_sentences=2),
                    status=fake.random_element(elements=["pending", "in-progress", "completed"]),
                    assignee_id=assignee.id if assignee else None,
                    due_date=due_date
                )
                task = await crud_task.create(db, obj_in=task_in)
                tasks_created += 1
                # logger.debug(f"Created task: {task.title} for project {project.name}")
        
        logger.info(f"Successfully seeded {len(users)} users, {len(projects)} projects, and {tasks_created} tasks.")

if __name__ == "__main__":
    asyncio.run(seed_data())
```