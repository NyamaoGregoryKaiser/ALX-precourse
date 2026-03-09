import asyncio
from datetime import datetime, timedelta
import os
import sys

# Ensure the app directory is in the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from passlib.context import CryptContext

from app.config import settings
from app.models.user import User
from app.models.task import Task, TaskStatus

# Load environment variables
load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_data():
    """
    Seeds the database with initial user and task data.
    """
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=engine, class_=AsyncSession
    )

    async with AsyncSessionLocal() as session:
        print("Starting database seeding...")

        # --- Seed Users ---
        users_to_add = [
            {"email": "admin@example.com", "password": "adminpassword", "is_admin": True},
            {"email": "user1@example.com", "password": "user1password"},
            {"email": "user2@example.com", "password": "user2password"},
        ]

        for user_data in users_to_add:
            existing_user = await session.execute(
                select(User).filter(User.email == user_data["email"])
            )
            if not existing_user.scalar_one_or_none():
                hashed_password = pwd_context.hash(user_data["password"])
                new_user = User(
                    email=user_data["email"],
                    hashed_password=hashed_password,
                    is_admin=user_data.get("is_admin", False)
                )
                session.add(new_user)
                await session.flush() # Flush to get the user ID
                print(f"Added user: {new_user.email}")
            else:
                print(f"User {user_data['email']} already exists. Skipping.")

        await session.commit()

        # Retrieve users to assign tasks
        admin_user = (await session.execute(select(User).filter(User.email == "admin@example.com"))).scalar_one()
        user1 = (await session.execute(select(User).filter(User.email == "user1@example.com"))).scalar_one()
        user2 = (await session.execute(select(User).filter(User.email == "user2@example.com"))).scalar_one()

        # --- Seed Tasks ---
        tasks_to_add = [
            {
                "title": "Complete project proposal",
                "description": "Draft and finalize the proposal for the new mobile app backend project.",
                "status": TaskStatus.PENDING,
                "due_date": datetime.now() + timedelta(days=7),
                "user_id": admin_user.id,
            },
            {
                "title": "Set up development environment",
                "description": "Install Docker, Python, and necessary tools.",
                "status": TaskStatus.IN_PROGRESS,
                "due_date": datetime.now() + timedelta(days=2),
                "user_id": admin_user.id,
            },
            {
                "title": "Write unit tests for authentication module",
                "description": "Ensure 80%+ coverage for user registration and login.",
                "status": TaskStatus.PENDING,
                "due_date": datetime.now() + timedelta(days=5),
                "user_id": user1.id,
            },
            {
                "title": "Document API endpoints",
                "description": "Generate OpenAPI documentation and write usage examples.",
                "status": TaskStatus.COMPLETED,
                "due_date": datetime.now() - timedelta(days=1), # Past due
                "user_id": user1.id,
            },
            {
                "title": "Research caching strategies for FastAPI",
                "description": "Look into Redis integration and cache invalidation patterns.",
                "status": TaskStatus.IN_PROGRESS,
                "due_date": datetime.now() + timedelta(days=10),
                "user_id": user2.id,
            },
            {
                "title": "Review PRs from team members",
                "description": "Check for code quality and adherence to standards.",
                "status": TaskStatus.PENDING,
                "due_date": datetime.now() + timedelta(days=3),
                "user_id": user2.id,
            },
        ]

        for task_data in tasks_to_add:
            # Check if a similar task already exists for the user (simple check)
            existing_task = await session.execute(
                select(Task).filter(
                    Task.user_id == task_data["user_id"],
                    Task.title == task_data["title"]
                )
            )
            if not existing_task.scalar_one_or_none():
                new_task = Task(**task_data)
                session.add(new_task)
                print(f"Added task: '{new_task.title}' for user {new_task.user_id}")
            else:
                print(f"Task '{task_data['title']}' for user {task_data['user_id']} already exists. Skipping.")

        await session.commit()
        print("Database seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_data())
    print("\nTo run this script:")
    print("1. Ensure Docker containers (db, redis, app) are up: `docker-compose up -d`")
    print("2. Run from the project root: `docker-compose exec app python scripts/seed_db.py`")
```

```