```python
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from flask import Flask
from flask.cli import with_appcontext
import click

from app import create_app, db, jwt, migrate, cache, limiter
from app.models import User, Product, Category, Order, OrderItem, Cart, CartItem
from scripts.seed_db import seed_all_data

# Create the Flask app instance
app = create_app(os.getenv('FLASK_ENV', 'development'))

# Custom command to seed the database
@app.cli.command("seed-db")
@with_appcontext
def seed_db_command():
    """Seeds the database with initial data."""
    click.echo("Seeding database...")
    seed_all_data(app)
    click.echo("Database seeded successfully.")

# Custom command to create admin user
@app.cli.command("create-admin")
@click.argument("email")
@click.argument("password")
@with_appcontext
def create_admin_command(email, password):
    """Creates an admin user."""
    click.echo(f"Creating admin user: {email}...")
    from app.services.user_service import UserService
    try:
        user = UserService.create_user(
            username=email.split('@')[0],
            email=email,
            password=password,
            role="admin"
        )
        click.echo(f"Admin user '{user.username}' created successfully.")
    except ValueError as e:
        click.echo(f"Error creating admin user: {e}")

if __name__ == '__main__':
    # This block is primarily for development using `python manage.py runserver`
    # In production, Gunicorn will call `app` directly from `manage:app`
    app.run(debug=True)
```