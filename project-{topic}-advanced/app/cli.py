import click
from flask.cli import with_appcontext
from app.database import db
from app.models import User
from app.utils.helpers import hash_password

@click.command('seed-db')
@with_appcontext
def seed_database():
    """Seeds the database with initial data."""
    if User.query.filter_by(username='admin').first():
        click.echo('Admin user already exists. Skipping seeding.')
        return

    admin_user = User(
        username='admin',
        email='admin@example.com',
        is_admin=True
    )
    admin_user.set_password('password') # Default password for admin
    db.session.add(admin_user)

    db.session.commit()
    click.echo('Database seeded with an admin user (username: admin, password: password).')

# This file is meant to be included in manage.py or app.__init__.py
# For instance, in `manage.py` you might have:
# from app.cli import seed_database
# manager.add_command('seed-db', seed_database)
```