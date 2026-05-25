import click
from flask.cli import with_appcontext
from app.extensions import db
from app.models import User
from faker import Faker
import logging

fake = Faker()
logger = logging.getLogger(__name__)

def register_cli_commands(app):
    """Register custom CLI commands for the Flask application."""

    @app.cli.group()
    def db_commands():
        """Database management commands."""
        pass

    @db_commands.command('seed')
    @click.option('--count', default=10, help='Number of users to create.')
    def seed_db(count):
        """Seeds the database with dummy users."""
        if User.query.first():
            click.echo("Database already contains users. Skipping seeding.")
            return

        click.echo(f"Seeding database with {count} users...")
        for _ in range(count):
            try:
                user = User(
                    username=fake.user_name(),
                    email=fake.email(),
                    password='password123', # Consistent password for dummy users
                    is_verified=fake.boolean(chance_of_getting_true=80)
                )
                db.session.add(user)
            except Exception as e:
                logger.error(f"Error seeding user: {e}")
                db.session.rollback()
                continue
        db.session.commit()
        click.echo(f"Successfully seeded {count} users.")

    @db_commands.command('create-admin')
    @click.option('--username', prompt='Admin username', help='The username for the admin account.')
    @click.option('--email', prompt='Admin email', help='The email for the admin account.')
    @click.password_option(help='The password for the admin account.')
    def create_admin(username, email, password):
        """Creates an admin user."""
        existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            click.echo(f"User with username '{username}' or email '{email}' already exists.")
            return

        click.echo(f"Creating admin user: {username}...")
        admin_user = User(username=username, email=email, password=password, role='admin', is_verified=True)
        db.session.add(admin_user)
        db.session.commit()
        click.echo(f"Admin user '{username}' created successfully!")