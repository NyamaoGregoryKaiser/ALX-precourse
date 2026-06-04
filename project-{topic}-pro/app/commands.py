```python
import click
from flask.cli import with_appcontext
from app.extensions import db, bcrypt
from app.models import User, Category, Tag, Post
from datetime import datetime
import uuid
from faker import Faker # For generating fake data
import random
import slugify # pip install python-slugify

fake = Faker()

def register_commands(app):
    """Register custom CLI commands for the Flask application."""

    @app.cli.group()
    def db_manage():
        """Database management commands."""
        pass

    @db_manage.command('create')
    @with_appcontext
    def create_db():
        """Creates all database tables."""
        db.create_all()
        click.echo('Database tables created.')

    @db_manage.command('drop')
    @with_appcontext
    def drop_db():
        """Drops all database tables."""
        if click.confirm('Are you sure you want to drop ALL database tables? This action is irreversible.', abort=True):
            db.drop_all()
            click.echo('Database tables dropped.')

    @db_manage.command('seed')
    @click.option('--users', default=5, help='Number of users to create.')
    @click.option('--categories', default=5, help='Number of categories to create.')
    @click.option('--tags', default=10, help='Number of tags to create.')
    @click.option('--posts', default=20, help='Number of posts to create.')
    @with_appcontext
    def seed_db(users, categories, tags, posts):
        """Seeds the database with initial data."""
        click.echo('Seeding database...')

        # Create an admin user first
        if not User.query.filter_by(username='admin').first():
            admin_user = User(
                username='admin',
                email='admin@example.com',
                password='adminpassword', # In production, use strong, generated password
                role='admin',
                is_active=True
            )
            db.session.add(admin_user)
            click.echo('Admin user created (username: admin, password: adminpassword).')

        # Create a test author user
        if not User.query.filter_by(username='author').first():
            author_user = User(
                username='author',
                email='author@example.com',
                password='authorpassword',
                role='author',
                is_active=True
            )
            db.session.add(author_user)
            click.echo('Author user created (username: author, password: authorpassword).')
        
        db.session.commit() # Commit admin/author before generating others to link posts

        # Seed Users
        existing_users_count = User.query.count()
        if existing_users_count < users:
            num_to_add = users - existing_users_count
            for _ in range(num_to_add):
                username = fake.user_name()
                # Ensure username is unique for fake data
                while User.query.filter_by(username=username).first():
                    username = fake.user_name() + str(random.randint(1, 100))
                
                email = fake.email()
                while User.query.filter_by(email=email).first():
                    email = fake.email()
                
                new_user = User(
                    username=username,
                    email=email,
                    password='password123',
                    role=random.choice(['contributor', 'author', 'editor']),
                    is_active=True
                )
                db.session.add(new_user)
            db.session.commit()
            click.echo(f'{num_to_add} additional users seeded.')
        else:
            click.echo('Sufficient users already exist, skipping user seeding.')

        all_users = User.query.all()
        if not all_users:
            click.echo("No users available to link content. Please seed users first.")
            return

        # Seed Categories
        if Category.query.count() < categories:
            for _ in range(categories):
                name = fake.word().capitalize()
                slug = slugify.slugify(name)
                new_category = Category(
                    name=name,
                    slug=slug,
                    description=fake.paragraph(nb_sentences=2)
                )
                db.session.add(new_category)
            db.session.commit()
            click.echo(f'{categories} categories seeded.')
        else:
            click.echo('Sufficient categories already exist, skipping category seeding.')

        all_categories = Category.query.all()

        # Seed Tags
        if Tag.query.count() < tags:
            for _ in range(tags):
                name = fake.word().capitalize()
                slug = slugify.slugify(name)
                new_tag = Tag(name=name, slug=slug)
                db.session.add(new_tag)
            db.session.commit()
            click.echo(f'{tags} tags seeded.')
        else:
            click.echo('Sufficient tags already exist, skipping tag seeding.')

        all_tags = Tag.query.all()

        # Seed Posts
        if Post.query.count() < posts:
            num_to_add = posts - Post.query.count()
            for _ in range(num_to_add):
                title = fake.sentence(nb_words=random.randint(4, 10)).replace('.', '')
                slug = slugify.slugify(title + "-" + fake.uuid4()[:8]) # Ensure unique slug
                
                # Ensure title/slug are unique (basic check, can be more robust)
                while Post.query.filter_by(slug=slug).first():
                    title = fake.sentence(nb_words=random.randint(4, 10)).replace('.', '')
                    slug = slugify.slugify(title + "-" + fake.uuid4()[:8])

                author = random.choice(all_users)
                category = random.choice(all_categories) if all_categories else None
                post_tags = random.sample(all_tags, k=random.randint(0, min(3, len(all_tags)))) if all_tags else []

                status = random.choice(['draft', 'published', 'pending'])
                published_at = datetime.utcnow() if status == 'published' else None

                new_post = Post(
                    title=title,
                    slug=slug,
                    content=fake.paragraphs(nb=random.randint(3, 10), ext_word_list=None),
                    excerpt=fake.paragraph(nb_sentences=3),
                    author_id=author.id,
                    category_id=category.id if category else None,
                    status=status,
                    visibility=random.choice(['public', 'private']),
                    published_at=published_at
                )
                new_post.tags.extend(post_tags) # Add selected tags
                db.session.add(new_post)
            db.session.commit()
            click.echo(f'{num_to_add} additional posts seeded.')
        else:
            click.echo('Sufficient posts already exist, skipping post seeding.')


        click.echo('Database seeding complete.')

    app.cli.add_command(db_manage)
```