import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Add the 'app' directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, Task, Role, TaskStatus
from app.services.auth_service import AuthService

def seed_database():
    """
    Seeds the database with initial users and tasks for development/testing.
    """
    env = os.getenv('FLASK_ENV', 'development')
    config_name = 'development' if env == 'development' else 'production'
    app = create_app(config_name)

    with app.app_context():
        print(f"Using database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables...")
        db.create_all()

        print("Seeding users...")
        try:
            admin_user = AuthService.register_user("admin", "admin@example.com", "adminpass", role=Role.ADMIN)
            regular_user1 = AuthService.register_user("user1", "user1@example.com", "user1pass", role=Role.USER)
            regular_user2 = AuthService.register_user("user2", "user2@example.com", "user2pass", role=Role.USER)
            db.session.commit() # Commit users
        except Exception as e:
            print(f"Error seeding users: {e}")
            db.session.rollback()
            return

        print("Seeding tasks...")
        try:
            task1 = Task(
                title="Review project requirements",
                description="Go through the SRS and make sure all features are understood.",
                status=TaskStatus.IN_PROGRESS,
                due_date=datetime.utcnow() + timedelta(days=7),
                created_by_id=admin_user.id,
                assigned_to_id=admin_user.id
            )
            task2 = Task(
                title="Implement user authentication",
                description="Develop JWT-based authentication for the API.",
                status=TaskStatus.PENDING,
                due_date=datetime.utcnow() + timedelta(days=14),
                created_by_id=admin_user.id,
                assigned_to_id=regular_user1.id
            )
            task3 = Task(
                title="Write unit tests for services",
                description="Achieve 80% coverage for user and task services.",
                status=TaskStatus.PENDING,
                due_date=datetime.utcnow() + timedelta(days=21),
                created_by_id=regular_user1.id,
                assigned_to_id=regular_user2.id
            )
            task4 = Task(
                title="Prepare deployment script",
                description="Create Dockerfile and docker-compose for production deployment.",
                status=TaskStatus.COMPLETED,
                due_date=datetime.utcnow() - timedelta(days=5),
                created_by_id=admin_user.id,
                assigned_to_id=regular_user1.id
            )
            task5 = Task(
                title="Research caching strategies",
                description="Look into Redis and other caching options for performance.",
                status=TaskStatus.IN_PROGRESS,
                due_date=datetime.utcnow() + timedelta(days=10),
                created_by_id=regular_user2.id,
                assigned_to_id=regular_user2.id
            )

            db.session.add_all([task1, task2, task3, task4, task5])
            db.session.commit()
            print("Database seeded successfully!")
        except Exception as e:
            print(f"Error seeding tasks: {e}")
            db.session.rollback()
            return

if __name__ == '__main__':
    seed_database()
```