import os
import click
from app import create_app, db, bcrypt
from flask_migrate import Migrate, upgrade, init as migrate_init, stamp
from app.models import User, Category, Product, Cart # Ensure models are imported to be known by Alembic
from faker import Faker
from slugify import slugify
from decimal import Decimal
import random
from dotenv import load_dotenv

load_dotenv()

app = create_app(os.environ.get('FLASK_CONFIG_TYPE', 'development'))
migrate = Migrate(app, db)
fake = Faker()

@app.shell_context_processor
def make_shell_context():
    return dict(app=app, db=db, User=User, Category=Category, Product=Product, Cart=Cart)

@app.cli.group()
def db_commands():
    """Database management commands."""
    pass

@db_commands.command('init')
def init_db():
    """Initialize the database (create all tables, no migrations)."""
    with app.app_context():
        db.create_all()
        click.echo('Initialized the database.')

@db_commands.command('drop')
def drop_db():
    """Drop all database tables."""
    if click.confirm('Are you sure you want to drop all database tables? This action is irreversible.', abort=True):
        with app.app_context():
            db.drop_all()
            click.echo('Dropped all database tables.')

@db_commands.command('reset')
def reset_db():
    """Drop and re-initialize the database."""
    with app.app_context():
        db.drop_all()
        db.create_all()
        click.echo('Reset the database.')

@db_commands.command('seed')
@click.option('--num_users', default=10, help='Number of fake users to create.')
@click.option('--num_categories', default=5, help='Number of fake categories to create.')
@click.option('--num_products_per_category', default=10, help='Number of fake products per category.')
def seed_db(num_users, num_categories, num_products_per_category):
    """Seed the database with initial data."""
    with app.app_context():
        click.echo("Seeding database...")
        
        # Clear existing data
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
        click.echo("Existing data cleared.")

        # Create Admin User
        admin_email = app.config.get('ADMIN_EMAIL')
        admin_password = app.config.get('ADMIN_PASSWORD')
        if not User.query.filter_by(email=admin_email).first():
            admin_user = User(username='admin', email=admin_email, password=admin_password, role='admin')
            db.session.add(admin_user)
            db.session.flush() # Flush to get admin_user.id for cart
            admin_cart = Cart(user_id=admin_user.id)
            db.session.add(admin_cart)
            click.echo(f"Admin user '{admin_email}' created.")

        # Create regular users
        users = []
        for i in range(num_users):
            username = fake.unique.user_name()
            email = fake.unique.email()
            password = 'password123' # Default password for fake users
            user = User(username=username, email=email, password=password, role='customer')
            db.session.add(user)
            db.session.flush() # Flush to get user.id for cart
            cart = Cart(user_id=user.id)
            db.session.add(cart)
            users.append(user)
        click.echo(f"{num_users} fake users created.")

        # Create categories
        categories = []
        for _ in range(num_categories):
            name = fake.unique.word().capitalize() + " Category"
            slug = slugify(name)
            description = fake.paragraph(nb_sentences=3)
            category = Category(name=name, slug=slug, description=description)
            db.session.add(category)
            categories.append(category)
        db.session.commit() # Commit categories to ensure they have IDs
        click.echo(f"{num_categories} fake categories created.")

        # Create products
        products = []
        for category in categories:
            for _ in range(num_products_per_category):
                name = f"{fake.color_name()} {fake.word()} {category.name.replace(' Category', '')}"
                slug = slugify(name + '-' + str(fake.unique.random_int(min=1000, max=9999))) # Ensure unique slug
                description = fake.paragraph(nb_sentences=5)
                price = Decimal(random.uniform(5.00, 500.00)).quantize(Decimal('0.01'))
                stock_quantity = random.randint(0, 100)
                image_url = f"https://picsum.photos/seed/{fake.unique.word()}/400/300"
                
                product = Product(
                    name=name,
                    slug=slug,
                    description=description,
                    price=price,
                    stock_quantity=stock_quantity,
                    image_url=image_url,
                    category_id=category.id
                )
                db.session.add(product)
                products.append(product)
        db.session.commit()
        click.echo(f"{num_categories * num_products_per_category} fake products created.")

        db.session.commit()
        click.echo("Database seeding complete.")

@db_commands.command('migrate')
def run_migrations():
    """Run database migrations."""
    with app.app_context():
        try:
            migrate_init() # Initialize migration repository if not exists
        except Exception:
            pass # Ignore if already initialized
        
        click.echo("Running database migrations...")
        upgrade() # Apply all pending migrations
        click.echo("Migrations complete.")

@db_commands.command('makemigrations')
@click.option('-m', '--message', default='Initial migration', help='Migration message.')
def make_migrations(message):
    """Create a new migration script."""
    with app.app_context():
        click.echo(f"Creating migration: {message}...")
        # This will automatically generate a new migration file based on model changes
        # Use flask db migrate -m "message" when running manually
        from flask_migrate import stamp, migrate as flask_migrate
        try:
            # Ensure migration repo is initialized, if not stamp it as current for first migration
            migrate_init() 
            stamp() # Stamp current DB to latest head if not already
        except Exception:
             pass # ignore if already init/stamped
        
        # This is where the actual migration script generation happens via Alembic internal calls
        # For simplicity, we just prompt the user here to run `flask db migrate -m "message"` manually
        # as Flask-Migrate CLI is usually invoked directly for this
        click.echo("Please run `flask db migrate -m \"{}\"` manually to generate migration script.".format(message))
        click.echo("Then review the generated script in the 'migrations/versions' folder.")

@app.cli.command('runserver')
@click.option('--host', '-h', default='0.0.0.0', help='The host address to bind to.')
@click.option('--port', '-p', default=5000, help='The port to listen on.')
def run_server(host, port):
    """Run the development server."""
    with app.app_context():
        app.run(host=host, port=port)

if __name__ == '__main__':
    app.cli()