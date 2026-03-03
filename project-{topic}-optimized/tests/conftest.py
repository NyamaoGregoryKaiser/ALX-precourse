import pytest
import os
from app import create_app, db
from app.models.user import User
from app.models.scraper_config import ScraperConfig
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraping_result import ScrapingResult
from app.auth.services import AuthService
import json

@pytest.fixture(scope='session')
def app():
    """Create and configure a new app instance for each test session."""
    os.environ['FLASK_ENV'] = 'testing'
    app = create_app()
    with app.app_context():
        # Ensure test database exists and is clean
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def auth_tokens(app):
    """
    Fixture to create test users and return their JWT tokens.
    Cleans up users after the test.
    """
    with app.app_context():
        # Create users
        admin_user = User(username='testadmin', email='testadmin@example.com', is_admin=True)
        admin_user.set_password('testadminpass')
        user = User(username='testuser', email='testuser@example.com', is_admin=False)
        user.set_password('testuserpass')
        db.session.add_all([admin_user, user])
        db.session.commit()

        # Generate tokens
        admin_token = AuthService._generate_jwt_token(admin_user.id)
        user_token = AuthService._generate_jwt_token(user.id)

        yield {
            'admin_id': admin_user.id,
            'admin_token': admin_token,
            'user_id': user.id,
            'user_token': user_token
        }

        # Clean up
        db.session.delete(admin_user)
        db.session.delete(user)
        db.session.commit()

@pytest.fixture(scope='function')
def authenticated_client(client, auth_tokens):
    """A test client authenticated as a regular user."""
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {auth_tokens["user_token"]}'
    return client

@pytest.fixture(scope='function')
def admin_client(client, auth_tokens):
    """A test client authenticated as an admin user."""
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {auth_tokens["admin_token"]}'
    return client

@pytest.fixture(scope='function')
def test_user(app):
    """Creates and yields a test user, then cleans up."""
    with app.app_context():
        user = User(username='test_u', email='test_u@example.com')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()
        yield user
        db.session.delete(user)
        db.session.commit()

@pytest.fixture(scope='function')
def test_admin_user(app):
    """Creates and yields a test admin user, then cleans up."""
    with app.app_context():
        admin_user = User(username='test_admin', email='test_admin@example.com', is_admin=True)
        admin_user.set_password('adminpassword')
        db.session.add(admin_user)
        db.session.commit()
        yield admin_user
        db.session.delete(admin_user)
        db.session.commit()

@pytest.fixture(scope='function')
def test_scraper_config(app, test_user):
    """Creates and yields a test scraper config, then cleans up."""
    with app.app_context():
        config = ScraperConfig(
            user_id=test_user.id,
            name='Test Scraper',
            start_url='http://example.com',
            css_selectors={"title": "h1", "body": "p.main"}
        )
        db.session.add(config)
        db.session.commit()
        yield config
        db.session.delete(config)
        db.session.commit()

@pytest.fixture(scope='function')
def test_scraping_job(app, test_scraper_config):
    """Creates and yields a test scraping job, then cleans up."""
    with app.app_context():
        job = ScrapingJob(
            scraper_config_id=test_scraper_config.id,
            user_id=test_scraper_config.user_id,
            status=JobStatus.PENDING
        )
        db.session.add(job)
        db.session.commit()
        yield job
        db.session.delete(job)
        db.session.commit()

@pytest.fixture(scope='function')
def test_scraping_result(app, test_scraping_job):
    """Creates and yields a test scraping result, then cleans up."""
    with app.app_context():
        result = ScrapingResult(
            job_id=test_scraping_job.id,
            data={"title": "Example Domain", "body": "This domain is for use in illustrative examples in documents."},
            url=test_scraping_job.config.start_url
        )
        db.session.add(result)
        db.session.commit()
        yield result
        db.session.delete(result)
        db.session.commit()
```