```python
import pytest
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.models.media import Media, MediaType
from app.extensions import db
import datetime

@pytest.mark.usefixtures("app", "session")
class TestUserModel:
    def test_create_user(self):
        user = User(username='testuser', email='test@example.com', password='password123', role=UserRole.USER)
        db.session.add(user)
        db.session.commit()
        assert user.id is not None
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.role == UserRole.USER
        assert user.is_active is True
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_set_and_check_password(self):
        user = User(username='passuser', email='pass@example.com', password='securepassword')
        assert user.password_hash is not None
        assert user.check_password('securepassword') is True
        assert user.check_password('wrongpassword') is False

    def test_user_roles(self):
        admin = User(username='adm', email='adm@ex.com', password='p', role=UserRole.ADMIN)
        editor = User(username='edt', email='edt@ex.com', password='p', role=UserRole.EDITOR)
        regular = User(username='reg', email='reg@ex.com', password='p', role=UserRole.USER)

        assert admin.is_admin() is True
        assert admin.is_editor() is True # Admin is also an editor
        assert admin.has_role(UserRole.ADMIN) is True
        assert admin.has_role([UserRole.ADMIN, UserRole.USER]) is True
        assert admin.has_role(UserRole.USER) is False # Admin is not a "regular user" only

        assert editor.is_admin() is False
        assert editor.is_editor() is True
        assert editor.has_role(UserRole.EDITOR) is True
        assert editor.has_role(UserRole.ADMIN) is False

        assert regular.is_admin() is False
        assert regular.is_editor() is False
        assert regular.has_role(UserRole.USER) is True
        assert regular.has_role(UserRole.EDITOR) is False

@pytest.mark.usefixtures("app", "session")
class TestCategoryModel:
    def test_create_category(self):
        category = Category(name='News', slug='news', description='Latest happenings')
        db.session.add(category)
        db.session.commit()
        assert category.id is not None
        assert category.name == 'News'
        assert category.slug == 'news'

    def test_unique_category_slug(self):
        category1 = Category(name='UniqueCat', slug='unique-cat')
        category2 = Category(name='AnotherCat', slug='unique-cat')
        db.session.add(category1)
        db.session.commit()
        db.session.add(category2)
        with pytest.raises(Exception): # Expecting an IntegrityError or similar due to unique constraint
            db.session.commit()
        db.session.rollback() # Rollback the failed transaction


@pytest.mark.usefixtures("app", "session")
class TestPostModel:
    @pytest.fixture(autouse=True)
    def setup_users_categories_for_posts(self, session):
        self.user = User(username='postauthor', email='post@example.com', password='password', role=UserRole.EDITOR)
        self.category = Category(name='Tech', slug='tech')
        session.add_all([self.user, self.category])
        session.commit()

    def test_create_post(self):
        post = Post(title='My First Post', slug='my-first-post', content='Hello world!', author_id=self.user.id, category_id=self.category.id)
        db.session.add(post)
        db.session.commit()
        assert post.id is not None
        assert post.title == 'My First Post'
        assert post.author.username == 'postauthor'
        assert post.category.name == 'Tech'
        assert post.status == PostStatus.DRAFT
        assert post.published_at is None

    def test_publish_post(self):
        post = Post(title='Draft Post', slug='draft-post', content='Draft content', author_id=self.user.id)
        db.session.add(post)
        db.session.commit()
        assert post.status == PostStatus.DRAFT
        assert post.published_at is None

        post.publish()
        db.session.commit()
        assert post.status == PostStatus.PUBLISHED
        assert post.published_at is not None

    def test_unpublish_post(self):
        post = Post(title='Published Post', slug='published-post-unpub', content='Published content', author_id=self.user.id, status=PostStatus.PUBLISHED, published_at=datetime.datetime.now())
        db.session.add(post)
        db.session.commit()
        assert post.status == PostStatus.PUBLISHED
        assert post.published_at is not None

        post.unpublish()
        db.session.commit()
        assert post.status == PostStatus.DRAFT
        assert post.published_at is None

    def test_archive_post(self):
        post = Post(title='Active Post', slug='active-post', content='Active content', author_id=self.user.id, status=PostStatus.PUBLISHED)
        db.session.add(post)
        db.session.commit()
        assert post.status == PostStatus.PUBLISHED

        post.archive()
        db.session.commit()
        assert post.status == PostStatus.ARCHIVED

@pytest.mark.usefixtures("app", "session")
class TestMediaModel:
    @pytest.fixture(autouse=True)
    def setup_users_mediatype_for_media(self, session):
        self.user = User(username='mediauploader', email='media@example.com', password='password', role=UserRole.USER)
        self.media_type = MediaType(name='image', description='Image files')
        session.add_all([self.user, self.media_type])
        session.commit()

    def test_create_media(self):
        media = Media(filename='pic.jpg', filepath='/uploads/pic.jpg', uploader_id=self.user.id, media_type_id=self.media_type.id, filesize=1024, width=800, height=600)
        db.session.add(media)
        db.session.commit()
        assert media.id is not None
        assert media.filename == 'pic.jpg'
        assert media.filepath == '/uploads/pic.jpg'
        assert media.uploader.username == 'mediauploader'
        assert media.media_type.name == 'image'
        assert media.filesize == 1024

    def test_unique_media_filepath(self):
        media1 = Media(filename='f1.jpg', filepath='/uploads/f1.jpg', uploader_id=self.user.id, media_type_id=self.media_type.id)
        media2 = Media(filename='f2.jpg', filepath='/uploads/f1.jpg', uploader_id=self.user.id, media_type_id=self.media_type.id)
        db.session.add(media1)
        db.session.commit()
        db.session.add(media2)
        with pytest.raises(Exception):
            db.session.commit()
        db.session.rollback()

```