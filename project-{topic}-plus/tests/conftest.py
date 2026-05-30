```python
import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.post import Post, PostStatus, post_media
from app.models.media import Media, MediaType
from app.utils.jwt_handlers import create_auth_tokens, REVOKED_TOKENS
import os

@pytest.fixture(scope='session')
def app():
    """Fixture for a Flask app instance, configured for testing."""
    os.environ['FLASK_ENV'] = 'testing'
    _app = create_app()

    with _app.app_context():
        # Create all tables for the in-memory SQLite database
        db.create_all()
        
        # Seed initial data for tests
        # Create media types
        image_type = MediaType(name='image', description='Image files')
        video_type = MediaType(name='video', description='Video files')
        document_type = MediaType(name='document', description='Document files')
        db.session.add_all([image_type, video_type, document_type])
        db.session.commit()

        # Create test users
        admin_user = User(username='admin_test', email='admin_test@example.com', password='password', role=UserRole.ADMIN)
        editor_user = User(username='editor_test', email='editor_test@example.com', password='password', role=UserRole.EDITOR)
        regular_user = User(username='user_test', email='user_test@example.com', password='password', role=UserRole.USER)
        
        db.session.add_all([admin_user, editor_user, regular_user])
        db.session.commit()

        # Create test categories
        category1 = Category(name='Technology', slug='technology', description='Tech related posts')
        category2 = Category(name='Lifestyle', slug='lifestyle', description='Lifestyle related posts')
        db.session.add_all([category1, category2])
        db.session.commit()

        # Create test media
        media1 = Media(filename='test_image1.jpg', filepath='/uploads/test_image1.jpg', uploader_id=admin_user.id, media_type_id=image_type.id)
        media2 = Media(filename='test_video1.mp4', filepath='/uploads/test_video1.mp4', uploader_id=editor_user.id, media_type_id=video_type.id)
        db.session.add_all([media1, media2])
        db.session.commit()

        # Create test posts
        post1 = Post(title='Admin Post', slug='admin-post', content='Content by admin', author_id=admin_user.id, category_id=category1.id, status=PostStatus.PUBLISHED)
        post2 = Post(title='Editor Draft', slug='editor-draft', content='Content by editor', author_id=editor_user.id, category_id=category1.id, status=PostStatus.DRAFT)
        post3 = Post(title='Published Post', slug='published-post', content='Another published post', author_id=regular_user.id, category_id=category2.id, status=PostStatus.PUBLISHED)
        db.session.add_all([post1, post2, post3])
        db.session.commit()

        # Associate media with post1
        post1.media_assets.append(media1)
        db.session.commit()

        yield _app

        # Teardown: Clean up database after all tests in the session
        db.session.remove()
        db.drop_all()
        # Clear revoked tokens for clean state
        REVOKED_TOKENS.clear()

@pytest.fixture(scope='function')
def client(app):
    """Fixture for a test client."""
    return app.test_client()

@pytest.fixture(scope='function')
def runner(app):
    """Fixture for a Flask CLI test runner."""
    return app.test_cli_runner()

@pytest.fixture(scope='function')
def session(app):
    """Fixture for a database session, rolled back after each test."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        db.session.bind = connection
        yield db.session
        transaction.rollback()
        connection.close()

@pytest.fixture(scope='function')
def auth_tokens(app):
    """Fixture for creating and retrieving auth tokens for test users."""
    with app.app_context():
        admin_user = User.query.filter_by(username='admin_test').first()
        editor_user = User.query.filter_by(username='editor_test').first()
        regular_user = User.query.filter_by(username='user_test').first()

        admin_access_token, admin_refresh_token = create_auth_tokens(admin_user.id, admin_user.role.value)
        editor_access_token, editor_refresh_token = create_auth_tokens(editor_user.id, editor_user.role.value)
        user_access_token, user_refresh_token = create_auth_tokens(regular_user.id, regular_user.role.value)

        return {
            'admin': {'access': admin_access_token, 'refresh': admin_refresh_token, 'id': admin_user.id},
            'editor': {'access': editor_access_token, 'refresh': editor_refresh_token, 'id': editor_user.id},
            'user': {'access': user_access_token, 'refresh': user_refresh_token, 'id': regular_user.id},
            'non_existent': {'access': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTY3ODU3NjgzNywianRpIjoiYjk3YjYyMDktYzkwNC00ZGEwLTg5YTktNzk4Y2RhMTY5ZTBiIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6OTk5OTksIm5iZiI6MTY3ODU3NjgzNywiZXhwIjoxNjc4NTc3NDM3LCJyb2xlIjoidXNlciJ9.invalidtoken', 'id': 99999}
        }

```