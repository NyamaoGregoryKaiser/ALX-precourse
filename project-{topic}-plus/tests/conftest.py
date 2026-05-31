import pytest
from app import create_app
from app.extensions import db
from app.models import User, DataSource, Visualization, Dashboard, DashboardVisualization
import os
from dotenv import load_dotenv

# Load .env variables for tests
load_dotenv('.env.example') # Load .env.example if .env is not present

@pytest.fixture(scope='session')
def app():
    """Create and configure a new app instance for each test session."""
    # Ensure FLASK_ENV is set to 'testing' for consistent test configuration
    os.environ['FLASK_ENV'] = 'testing'
    
    _app = create_app('testing')

    with _app.app_context():
        # Ensure database is clean before tests
        db.drop_all()
        db.create_all()

        # Create a test client
        yield _app

        # Clean up database after tests
        db.session.remove()
        db.drop_all()
        
    os.environ.pop('FLASK_ENV', None)


@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def session(app):
    """Provides a clean database session for each test function."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        
        # Bind the session to the connection
        options = dict(bind=connection, binds={})
        _session = db.create_scoped_session(options=options)
        
        # Replace the default session with our transactional session
        db.session = _session

        # Begin a savepoint (nested transaction)
        # This allows each test to rollback its changes without affecting other tests
        # within the same function scope.
        db.session.begin_nested() 

        yield db.session

        # Rollback the transaction after each test function
        db.session.remove()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope='function')
def test_user(session):
    """Creates a test user for authentication."""
    user = User(username='testuser', email='test@example.com')
    user.set_password('testpassword')
    session.add(user)
    session.commit()
    return user

@pytest.fixture(scope='function')
def admin_user(session):
    """Creates an admin test user."""
    admin = User(username='adminuser', email='admin@example.com')
    admin.set_password('adminpassword')
    session.add(admin)
    session.commit()
    # In a real app, you'd mark this user as admin (e.g., via a 'roles' table or 'is_admin' column)
    # For now, we'll assume JWT claims handle admin status.
    return admin

@pytest.fixture(scope='function')
def auth_headers(client, test_user):
    """Returns authorization headers for the test user."""
    response = client.post('/auth/login', json={
        'email': test_user.email,
        'password': 'testpassword'
    })
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture(scope='function')
def admin_auth_headers(client, admin_user):
    """Returns authorization headers for the admin user."""
    # Special claims for admin user
    response = client.post('/auth/login', json={
        'email': admin_user.email,
        'password': 'adminpassword'
    })
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture(scope='function')
def create_data_source(session, test_user):
    """Fixture to create a data source."""
    def _create_data_source(user=test_user, name='Test Source', type='CSV', file_path='/path/to/test.csv'):
        ds = DataSource(
            name=name,
            description='A test data source',
            type=type,
            file_path=file_path,
            schema_json={"columns": ["col1", "col2"]},
            user_id=user.id
        )
        session.add(ds)
        session.commit()
        return ds
    return _create_data_source

@pytest.fixture(scope='function')
def create_visualization(session, test_user, create_data_source):
    """Fixture to create a visualization."""
    data_source = create_data_source(user=test_user)
    def _create_visualization(user=test_user, ds=data_source, name='Test Viz', type='bar'):
        viz = Visualization(
            name=name,
            description='A test visualization',
            type=type,
            config_json={"chart_type": type, "x_axis": "col1", "y_axis": "col2"},
            query_json={"limit": 10},
            data_source_id=ds.id,
            user_id=user.id
        )
        session.add(viz)
        session.commit()
        return viz
    return _create_visualization

@pytest.fixture(scope='function')
def create_dashboard(session, test_user):
    """Fixture to create a dashboard."""
    def _create_dashboard(user=test_user, name='Test Dashboard'):
        dash = Dashboard(
            name=name,
            description='A test dashboard',
            layout_json={},
            user_id=user.id
        )
        session.add(dash)
        session.commit()
        return dash
    return _create_dashboard