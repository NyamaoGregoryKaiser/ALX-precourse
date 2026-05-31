import os
from app import create_app
from app.extensions import db
from flask.cli import FlaskGroup
from app.models import User, DataSource, Visualization, Dashboard, DashboardVisualization # Import models for 'flask shell' context
from config import get_config_class

# Use the FLASK_ENV environment variable to determine which config to load
# Default to 'development' if not set
config_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(config_name)

cli = FlaskGroup(app)

@cli.command('seed')
def seed_db():
    """Seeds the database with initial data."""
    from seed import seed_data
    with app.app_context():
        seed_data(db)
        app.logger.info("Database seeded successfully.")

@cli.command('create-admin')
def create_admin():
    """Creates an admin user."""
    with app.app_context():
        username = input("Enter admin username: ")
        email = input("Enter admin email: ")
        password = input("Enter admin password: ")

        if User.query.filter_by(email=email).first() or User.query.filter_by(username=username).first():
            print("User with that email or username already exists.")
            return

        admin_user = User(username=username, email=email)
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.commit()
        # In a real app, you'd mark this user as admin (e.g., via a 'roles' table or 'is_admin' column)
        print(f"Admin user '{username}' created with ID: {admin_user.id}")


@app.shell_context_processor
def make_shell_context():
    return {
        "db": db,
        "User": User,
        "DataSource": DataSource,
        "Visualization": Visualization,
        "Dashboard": Dashboard,
        "DashboardVisualization": DashboardVisualization
    }

if __name__ == '__main__':
    cli()