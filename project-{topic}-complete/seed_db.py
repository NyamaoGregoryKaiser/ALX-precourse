```python
import logging
from datetime import datetime, timedelta
from app.extensions import db
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.comment import Comment
from app.services.user_service import UserService
from app.services.project_service import ProjectService
from app.services.task_service import TaskService
from app.utils.exceptions import DuplicateResource, ResourceNotFound
from faker import Faker

logger = logging.getLogger(__name__)
fake = Faker()

def seed_initial_data(force_recreate=False):
    """
    Seeds the database with initial data.
    If force_recreate is True, it will drop all tables first.
    """
    logger.info("Starting database seeding...")

    if force_recreate:
        logger.warning("Force recreating database tables...")
        db.drop_all()
        db.create_all()
        logger.info("Tables dropped and recreated.")
    else:
        # Check if tables exist and are not empty
        try:
            if User.query.first() or Project.query.first() or Task.query.first():
                logger.info("Database already contains data. Skipping seeding. Use --force to reseed.")
                return
        except Exception as e:
            # If tables don't exist yet, db.query.first() might fail, proceed to create_all
            logger.warning(f"Could not query database (tables might not exist): {e}. Proceeding with create_all.")
            db.create_all()

    try:
        # Create Users
        admin_user = UserService.create_user({
            'username': 'admin',
            'email': 'admin@example.com',
            'password': 'adminpassword',
            'role': 'admin'
        })
        manager_user = UserService.create_user({
            'username': 'manager',
            'email': 'manager@example.com',
            'password': 'managerpassword',
            'role': 'manager'
        })
        regular_user1 = UserService.create_user({
            'username': 'john.doe',
            'email': 'john.doe@example.com',
            'password': 'userpassword',
            'role': 'user'
        })
        regular_user2 = UserService.create_user({
            'username': 'jane.smith',
            'email': 'jane.smith@example.com',
            'password': 'userpassword',
            'role': 'user'
        })

        # Generate more fake users
        fake_users = []
        for _ in range(5):
            try:
                user = UserService.create_user({
                    'username': fake.user_name(),
                    'email': fake.email(),
                    'password': 'password123',
                    'role': fake.random_element(elements=('user', 'manager'))
                })
                fake_users.append(user)
            except DuplicateResource:
                logger.warning("Skipping duplicate fake user creation.")
        
        all_users = [admin_user, manager_user, regular_user1, regular_user2] + fake_users
        
        logger.info("Users created.")

        # Create Projects
        project1 = ProjectService.create_project({
            'name': 'Website Redesign',
            'description': 'Complete overhaul of the company website for better UX.',
            'manager_id': manager_user.id,
            'status': 'active',
            'start_date': datetime.now() - timedelta(days=30),
            'end_date': datetime.now() + timedelta(days=60)
        })
        project2 = ProjectService.create_project({
            'name': 'Mobile App Development',
            'description': 'Develop a new mobile application for iOS and Android.',
            'manager_id': manager_user.id,
            'status': 'in_progress',
            'start_date': datetime.now() - timedelta(days=15),
            'end_date': datetime.now() + timedelta(days=90)
        })
        project3 = ProjectService.create_project({
            'name': 'Database Migration',
            'description': 'Migrate existing database from MySQL to PostgreSQL.',
            'manager_id': admin_user.id,
            'status': 'completed',
            'start_date': datetime.now() - timedelta(days=90),
            'end_date': datetime.now() - timedelta(days=30)
        })
        logger.info("Projects created.")

        # Create Tasks
        task1_proj1 = TaskService.create_task({
            'title': 'Design new UI/UX mockups',
            'description': 'Create wireframes and high-fidelity mockups for the new website.',
            'project_id': project1.id,
            'creator_id': manager_user.id,
            'assigned_to_id': regular_user1.id,
            'status': 'in_progress',
            'priority': 'high',
            'due_date': datetime.now() + timedelta(days=10)
        })
        task2_proj1 = TaskService.create_task({
            'title': 'Develop frontend components',
            'description': 'Implement React components based on approved designs.',
            'project_id': project1.id,
            'creator_id': manager_user.id,
            'assigned_to_id': regular_user2.id,
            'status': 'open',
            'priority': 'medium',
            'due_date': datetime.now() + timedelta(days=30)
        })
        task3_proj1 = TaskService.create_task({
            'title': 'Set up CI/CD pipeline',
            'description': 'Configure Jenkins/GitHub Actions for automated deployments.',
            'project_id': project1.id,
            'creator_id': manager_user.id,
            'assigned_to_id': admin_user.id,
            'status': 'done',
            'priority': 'medium',
            'due_date': datetime.now() - timedelta(days=5)
        })

        task1_proj2 = TaskService.create_task({
            'title': 'Define API endpoints for mobile app',
            'description': 'Document all necessary API endpoints for mobile consumption.',
            'project_id': project2.id,
            'creator_id': admin_user.id,
            'assigned_to_id': manager_user.id,
            'status': 'review',
            'priority': 'urgent',
            'due_date': datetime.now() + timedelta(days=3)
        })
        task2_proj2 = TaskService.create_task({
            'title': 'Implement user authentication module',
            'description': 'Develop secure user registration and login flows in the mobile app.',
            'project_id': project2.id,
            'creator_id': manager_user.id,
            'assigned_to_id': regular_user1.id,
            'status': 'in_progress',
            'priority': 'high',
            'due_date': datetime.now() + timedelta(days=20)
        })
        logger.info("Tasks created.")

        # Create Comments
        TaskService.add_comment_to_task(
            task_id=task1_proj1.id,
            content='Started working on wireframes. Will share initial draft by EOD.',
            author_id=regular_user1.id
        )
        TaskService.add_comment_to_task(
            task_id=task1_proj1.id,
            content='Great, looking forward to it!',
            author_id=manager_user.id
        )
        TaskService.add_comment_to_task(
            task_id=task3_proj1.id,
            content='CI/CD pipeline configured and tested. Ready for review.',
            author_id=admin_user.id
        )
        logger.info("Comments created.")
        
        db.session.commit()
        logger.info("Database seeding completed successfully.")

    except Exception as e:
        db.session.rollback()
        logger.error(f"Database seeding failed: {e}", exc_info=True)

```