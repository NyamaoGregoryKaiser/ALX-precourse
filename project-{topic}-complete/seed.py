```python
# seed.py
import os
import sys
from dotenv import load_dotenv

# Ensure the app directory is on the path for imports
sys.path.append(os.getcwd())

from app import create_app
from app.core.db import db
from app.models.user_model import User, Role
from app.models.target_db_model import TargetDatabase
from app.utils.logger import setup_logging

load_dotenv()
logger = setup_logging(__name__)

def seed_data():
    app = create_app()
    with app.app_context():
        logger.info("Starting to seed database...")

        # Create Roles
        admin_role = Role.query.filter_by(name='Admin').first()
        if not admin_role:
            admin_role = Role(name='Admin', description='Administrator with full access.')
            db.session.add(admin_role)
            logger.info("Added 'Admin' role.")
        
        user_role = Role.query.filter_by(name='User').first()
        if not user_role:
            user_role = Role(name='User', description='Standard user with limited access.')
            db.session.add(user_role)
            logger.info("Added 'User' role.")
        
        db.session.commit() # Commit roles first to get their IDs

        # Create Admin User
        admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@example.com')
        admin_password = os.getenv('ADMIN_PASSWORD', 'adminpass')

        if not User.find_by_username(admin_username):
            admin_user = User(email=admin_email, username=admin_username, role=admin_role)
            admin_user.set_password(admin_password)
            db.session.add(admin_user)
            logger.info(f"Added admin user: {admin_username}")
        else:
            logger.info(f"Admin user '{admin_username}' already exists.")

        # Create Sample User
        sample_username = os.getenv('SAMPLE_USERNAME', 'testuser')
        sample_email = os.getenv('SAMPLE_EMAIL', 'test@example.com')
        sample_password = os.getenv('SAMPLE_PASSWORD', 'testpass')

        if not User.find_by_username(sample_username):
            sample_user = User(email=sample_email, username=sample_username, role=user_role)
            sample_user.set_password(sample_password)
            db.session.add(sample_user)
            logger.info(f"Added sample user: {sample_username}")
        else:
            logger.info(f"Sample user '{sample_username}' already exists.")

        db.session.commit()

        # Add some sample target databases if they don't exist
        # Assuming the admin user is now committed and has an ID
        admin_user = User.find_by_username(admin_username)
        if admin_user:
            if not TargetDatabase.query.filter_by(name='Sample PostgreSQL DB').first():
                sample_db = TargetDatabase(
                    name='Sample PostgreSQL DB',
                    db_type='postgresql',
                    connection_string='postgresql://user:password@host:5432/dbname',
                    owner=admin_user
                )
                db.session.add(sample_db)
                logger.info("Added 'Sample PostgreSQL DB'.")
            else:
                logger.info("'Sample PostgreSQL DB' already exists.")

            if not TargetDatabase.query.filter_by(name='Another MySQL DB').first():
                another_db = TargetDatabase(
                    name='Another MySQL DB',
                    db_type='mysql',
                    connection_string='mysql://user:password@host:3306/dbname',
                    owner=admin_user
                )
                db.session.add(another_db)
                logger.info("Added 'Another MySQL DB'.")
            else:
                logger.info("'Another MySQL DB' already exists.")
        else:
            logger.warning("Admin user not found, cannot link target databases.")

        db.session.commit()
        logger.info("Database seeding complete.")

if __name__ == "__main__":
    seed_data()
```