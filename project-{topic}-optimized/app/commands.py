import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash
from app.database import db
from app.models.user import User, UserRole

def register_commands(app):
    @app.cli.group()
    def db_ops():
        """Database operations."""
        pass

    @db_ops.command('seed')
    @with_appcontext
    def seed_command():
        """Seeds the database with initial data."""
        click.echo("Seeding database...")
        seed_db()
        click.echo("Database seeded.")

    @db_ops.command('create-roles')
    @with_appcontext
    def create_roles_command():
        """Ensures all roles are present in the database."""
        click.echo("Creating default user roles...")
        create_default_roles()
        click.echo("Default user roles ensured.")

    @db_ops.command('create-admin')
    @click.argument('email')
    @click.argument('password')
    @with_appcontext
    def create_admin_command(email, password):
        """Creates an admin user."""
        click.echo(f"Creating admin user: {email}...")
        create_admin_user(email, password)
        click.echo("Admin user created.")

def seed_db():
    """Seeds the database with predefined data."""
    # Ensure roles exist first
    create_default_roles()

    # Create an admin user if not exists
    if not User.query.filter_by(email="admin@example.com").first():
        admin_role = UserRole.query.filter_by(name='ADMIN').first()
        admin_password_hash = generate_password_hash("adminpass123", method='pbkdf2:sha256')
        admin_user = User(
            username="admin",
            email="admin@example.com",
            password_hash=admin_password_hash,
            roles=[admin_role] if admin_role else []
        )
        db.session.add(admin_user)
        db.session.commit()
        click.echo("Created default admin user.")

    # Add more seed data here if needed for categories, products, etc.
    # For now, we'll keep it simple and focus on roles and admin.

def create_default_roles():
    """Ensures default user roles exist in the database."""
    roles_to_create = ['ADMIN', 'EDITOR', 'CUSTOMER']
    for role_name in roles_to_create:
        if not UserRole.query.filter_by(name=role_name).first():
            role = UserRole(name=role_name)
            db.session.add(role)
            db.session.commit()
            click.echo(f"  - Role '{role_name}' created.")

def create_admin_user(email, password):
    """Creates an admin user with specified credentials."""
    admin_role = UserRole.query.filter_by(name='ADMIN').first()
    if not admin_role:
        click.echo("Admin role not found. Please run 'flask db-ops create-roles' first.")
        return

    if User.query.filter_by(email=email).first():
        click.echo(f"User with email '{email}' already exists.")
        return

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    admin_user = User(
        username=email.split('@')[0], # Simple username from email
        email=email,
        password_hash=hashed_password,
        roles=[admin_role]
    )
    db.session.add(admin_user)
    db.session.commit()
    click.echo(f"Admin user '{email}' created successfully.")