import pytest
from app import create_app
from app.extensions import db, bcrypt
from app.models import User, Content, Category, Tag
from datetime import datetime
from flask_jwt_extended import create_access_token

@pytest.fixture(scope='session')
def flask_app():
    """Create a test Flask application instance."""
    app = create_app()
    app.config.from_object('config.TestingConfig') # Ensure testing config is loaded

    with app.app_context():
        db.create_all() # Create all tables in the in-memory SQLite database
        yield app
        db.session.remove()
        db.drop_all() # Drop all tables after tests

@pytest.fixture(scope='function')
def client(flask_app):
    """A test client for the application."""
    return flask_app.test_client()

@pytest.fixture(scope='function')
def init_database(flask_app):
    """
    Initializes a clean database for each test function.
    Rolls back transaction after each test.
    """
    with flask_app.app_context():
        db.session.begin_nested() # Use nested transaction for rollback
        yield db
        db.session.rollback() # Rollback all changes
        db.session.close()

@pytest.fixture(scope='function')
def sample_users(init_database):
    """Seed sample users for tests."""
    admin = User(username='admin_user', email='admin@test.com', role='admin')
    admin.set_password('password123')

    editor = User(username='editor_user', email='editor@test.com', role='editor')
    editor.set_password('password123')

    author = User(username='author_user', email='author@test.com', role='author')
    author.set_password('password123')

    db.session.add_all([admin, editor, author])
    db.session.commit()
    return {'admin': admin, 'editor': editor, 'author': author}

@pytest.fixture(scope='function')
def auth_tokens(flask_app, sample_users):
    """Generate JWT tokens for sample users."""
    with flask_app.app_context():
        admin_token = create_access_token(identity=sample_users['admin'].id, additional_claims={"role": "admin"})
        editor_token = create_access_token(identity=sample_users['editor'].id, additional_claims={"role": "editor"})
        author_token = create_access_token(identity=sample_users['author'].id, additional_claims={"role": "author"})
        return {
            'admin_token': admin_token,
            'editor_token': editor_token,
            'author_token': author_token
        }

@pytest.fixture(scope='function')
def sample_categories(init_database):
    """Seed sample categories for tests."""
    tech_cat = Category(name='Technology', description='Tech articles')
    food_cat = Category(name='Food', description='Food recipes')
    db.session.add_all([tech_cat, food_cat])
    db.session.commit()
    return {'tech': tech_cat, 'food': food_cat}

@pytest.fixture(scope='function')
def sample_tags(init_database):
    """Seed sample tags for tests."""
    python_tag = Tag(name='Python')
    flask_tag = Tag(name='Flask')
    db.session.add_all([python_tag, flask_tag])
    db.session.commit()
    return {'python': python_tag, 'flask': flask_tag}

@pytest.fixture(scope='function')
def sample_content(init_database, sample_users, sample_categories, sample_tags):
    """Seed sample content for tests."""
    content1 = Content(
        title='My First Article',
        body='This is the body of my first article.',
        status='published',
        user_id=sample_users['author'].id,
        category_id=sample_categories['tech'].id,
        is_featured=True,
        published_at=datetime.utcnow()
    )
    content1.tags.append(sample_tags['python'])

    content2 = Content(
        title='Draft Article',
        body='This is a draft article.',
        status='draft',
        user_id=sample_users['author'].id,
        category_id=sample_categories['food'].id
    )

    db.session.add_all([content1, content2])
    db.session.commit()
    return {'published': content1, 'draft': content2}
```