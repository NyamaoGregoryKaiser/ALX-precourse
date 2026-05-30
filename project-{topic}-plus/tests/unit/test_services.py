```python
import pytest
from app.services.user_service import UserService
from app.services.category_service import CategoryService
from app.services.post_service import PostService
from app.services.media_service import MediaService
from app.utils.errors import NotFoundError, ConflictError, BadRequestError, ForbiddenError
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.models.media import Media, MediaType
from app.extensions import db
import datetime

@pytest.mark.usefixtures("app", "session")
class TestUserService:
    def setup_method(self):
        self.user_service = UserService()
        # Seed test data from conftest
        self.admin = User.query.filter_by(username='admin_test').first()
        self.editor = User.query.filter_by(username='editor_test').first()
        self.regular = User.query.filter_by(username='user_test').first()

    def test_get_all_users(self):
        users = self.user_service.get_all_users()
        assert len(users) >= 3
        assert any(u['username'] == 'admin_test' for u in users)

    def test_get_user_by_id(self):
        user = self.user_service.get_user_by_id(self.admin.id)
        assert user['username'] == 'admin_test'

    def test_get_user_by_id_not_found(self):
        with pytest.raises(NotFoundError):
            self.user_service.get_user_by_id(9999)

    def test_create_user(self):
        new_user_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123',
            'role': UserRole.USER.value
        }
        user = self.user_service.create_user(new_user_data)
        assert user['username'] == 'newuser'
        assert user['email'] == 'newuser@example.com'
        assert user['role'] == UserRole.USER.value
        
        fetched_user = User.query.filter_by(username='newuser').first()
        assert fetched_user is not None
        assert fetched_user.check_password('password123')

    def test_create_user_duplicate_username(self):
        new_user_data = {
            'username': 'admin_test', # Duplicate
            'email': 'another@example.com',
            'password': 'password123'
        }
        with pytest.raises(ConflictError):
            self.user_service.create_user(new_user_data)

    def test_update_user(self):
        update_data = {'email': 'updated@example.com'}
        updated_user = self.user_service.update_user(self.regular.id, update_data)
        assert updated_user['email'] == 'updated@example.com'
        assert User.query.get(self.regular.id).email == 'updated@example.com'

    def test_update_user_change_password(self):
        update_data = {'new_password': 'newpassword123'}
        updated_user = self.user_service.update_user(self.regular.id, update_data)
        assert User.query.get(self.regular.id).check_password('newpassword123')

    def test_update_user_not_found(self):
        with pytest.raises(NotFoundError):
            self.user_service.update_user(9999, {'username': 'nonexistent'})

    def test_delete_user(self):
        user_to_delete = User(username='todelete', email='todelete@example.com', password='p')
        db.session.add(user_to_delete)
        db.session.commit()
        
        result = self.user_service.delete_user(user_to_delete.id)
        assert "deleted successfully" in result['message']
        assert User.query.get(user_to_delete.id) is None

    def test_delete_user_not_found(self):
        with pytest.raises(NotFoundError):
            self.user_service.delete_user(9999)

@pytest.mark.usefixtures("app", "session")
class TestCategoryService:
    def setup_method(self):
        self.category_service = CategoryService()
        self.category1 = Category.query.filter_by(slug='technology').first()
        self.category2 = Category.query.filter_by(slug='lifestyle').first()

    def test_get_all_categories(self):
        categories = self.category_service.get_all_categories()
        assert len(categories) >= 2
        assert any(c['slug'] == 'technology' for c in categories)

    def test_get_category_by_id(self):
        category = self.category_service.get_category_by_id(self.category1.id)
        assert category['name'] == 'Technology'

    def test_get_category_by_id_not_found(self):
        with pytest.raises(NotFoundError):
            self.category_service.get_category_by_id(9999)

    def test_create_category(self):
        new_cat_data = {'name': 'New Category', 'slug': 'new-category'}
        category = self.category_service.create_category(new_cat_data)
        assert category['name'] == 'New Category'
        assert Category.query.filter_by(slug='new-category').first() is not None

    def test_create_category_duplicate_slug(self):
        new_cat_data = {'name': 'Technology', 'slug': 'technology'} # Duplicate slug
        with pytest.raises(ConflictError):
            self.category_service.create_category(new_cat_data)

    def test_update_category(self):
        update_data = {'description': 'Updated description'}
        updated_cat = self.category_service.update_category(self.category1.id, update_data)
        assert updated_cat['description'] == 'Updated description'
        assert Category.query.get(self.category1.id).description == 'Updated description'

    def test_update_category_not_found(self):
        with pytest.raises(NotFoundError):
            self.category_service.update_category(9999, {'name': 'new name'})

    def test_delete_category(self):
        cat_to_delete = Category(name='Temp', slug='temp')
        db.session.add(cat_to_delete)
        db.session.commit()
        
        result = self.category_service.delete_category(cat_to_delete.id)
        assert "deleted successfully" in result['message']
        assert Category.query.get(cat_to_delete.id) is None

    def test_delete_category_with_posts(self):
        # Category1 has associated posts from conftest
        with pytest.raises(ConflictError):
            self.category_service.delete_category(self.category1.id)

@pytest.mark.usefixtures("app", "session")
class TestPostService:
    def setup_method(self):
        self.post_service = PostService()
        self.admin = User.query.filter_by(username='admin_test').first()
        self.editor = User.query.filter_by(username='editor_test').first()
        self.regular = User.query.filter_by(username='user_test').first()
        self.category = Category.query.filter_by(slug='technology').first()
        self.post1 = Post.query.filter_by(slug='admin-post').first() # by admin
        self.post2 = Post.query.filter_by(slug='editor-draft').first() # by editor
        self.post3 = Post.query.filter_by(slug='published-post').first() # by regular user
        self.media1 = Media.query.filter_by(filename='test_image1.jpg').first()

    def test_get_all_posts(self):
        posts = self.post_service.get_all_posts()
        assert len(posts) >= 3

    def test_get_all_posts_by_status(self):
        published_posts = self.post_service.get_all_posts(status=PostStatus.PUBLISHED.value)
        assert all(p['status'] == PostStatus.PUBLISHED.value for p in published_posts)
        assert len(published_posts) == 2 # admin-post, published-post

    def test_get_post_by_id(self):
        post = self.post_service.get_post_by_id(self.post1.id)
        assert post['title'] == 'Admin Post'

    def test_create_post(self):
        new_post_data = {
            'title': 'New Test Post',
            'slug': 'new-test-post',
            'content': 'This is new content.',
            'category_id': self.category.id,
            'status': PostStatus.DRAFT.value
        }
        post = self.post_service.create_post(new_post_data, self.editor.id)
        assert post['title'] == 'New Test Post'
        assert post['author_id'] == self.editor.id
        assert Post.query.filter_by(slug='new-test-post').first() is not None

    def test_create_post_duplicate_slug(self):
        new_post_data = {
            'title': 'Another Admin Post',
            'slug': 'admin-post', # Duplicate
            'content': 'More content.',
            'category_id': self.category.id
        }
        with pytest.raises(ConflictError):
            self.post_service.create_post(new_post_data, self.admin.id)

    def test_update_post(self):
        update_data = {'title': 'Updated Title', 'status': PostStatus.PUBLISHED.value}
        updated_post = self.post_service.update_post(self.post2.id, update_data, self.editor) # editor is author
        assert updated_post['title'] == 'Updated Title'
        assert updated_post['status'] == PostStatus.PUBLISHED.value
        assert Post.query.get(self.post2.id).title == 'Updated Title'
        assert Post.query.get(self.post2.id).status == PostStatus.PUBLISHED

    def test_update_post_forbidden_by_non_author(self):
        update_data = {'title': 'Forbidden Update'}
        with pytest.raises(ForbiddenError):
            self.post_service.update_post(self.post2.id, update_data, self.regular) # regular user trying to update editor's post

    def test_delete_post(self):
        post_to_delete = Post(title='Temp Post', slug='temp-post', content='Temp', author_id=self.admin.id)
        db.session.add(post_to_delete)
        db.session.commit()
        
        result = self.post_service.delete_post(post_to_delete.id, self.admin)
        assert "deleted successfully" in result['message']
        assert Post.query.get(post_to_delete.id) is None

    def test_delete_post_forbidden_by_non_admin_non_author(self):
        with pytest.raises(ForbiddenError):
            self.post_service.delete_post(self.post1.id, self.editor) # editor trying to delete admin's post

    def test_associate_media_to_post(self):
        post_obj = Post.query.get(self.post2.id) # Editor's draft post
        assert self.media1 not in post_obj.media_assets

        updated_post = self.post_service.associate_media_to_post(self.post2.id, self.media1.id, self.editor)
        
        post_obj = Post.query.get(self.post2.id)
        assert any(m.id == self.media1.id for m in post_obj.media_assets)
        assert any(m['id'] == self.media1.id for m in updated_post['media_assets'])

    def test_associate_media_to_post_already_associated(self):
        # self.post1 already has self.media1 associated
        with pytest.raises(ConflictError):
            self.post_service.associate_media_to_post(self.post1.id, self.media1.id, self.admin)
    
    def test_disassociate_media_from_post(self):
        post_obj = Post.query.get(self.post1.id) # Admin's post, already has media1
        assert self.media1 in post_obj.media_assets

        updated_post = self.post_service.disassociate_media_from_post(self.post1.id, self.media1.id, self.admin)
        
        post_obj = Post.query.get(self.post1.id)
        assert self.media1 not in post_obj.media_assets
        assert not any(m['id'] == self.media1.id for m in updated_post['media_assets'])

    def test_disassociate_media_from_post_not_associated(self):
        # self.post2 does not have self.media1 associated initially
        with pytest.raises(BadRequestError):
            self.post_service.disassociate_media_from_post(self.post2.id, self.media1.id, self.editor)


@pytest.mark.usefixtures("app", "session")
class TestMediaService:
    def setup_method(self):
        self.media_service = MediaService()
        self.admin = User.query.filter_by(username='admin_test').first()
        self.editor = User.query.filter_by(username='editor_test').first()
        self.image_type = MediaType.query.filter_by(name='image').first()
        self.video_type = MediaType.query.filter_by(name='video').first()
        self.media1 = Media.query.filter_by(filename='test_image1.jpg').first() # Uploaded by admin
        self.media2 = Media.query.filter_by(filename='test_video1.mp4').first() # Uploaded by editor

    def test_get_all_media(self):
        media_items = self.media_service.get_all_media()
        assert len(media_items) >= 2

    def test_get_all_media_by_uploader(self):
        admin_media = self.media_service.get_all_media(uploader_id=self.admin.id)
        assert len(admin_media) == 1
        assert admin_media[0]['filename'] == 'test_image1.jpg'

    def test_get_media_by_id(self):
        media_item = self.media_service.get_media_by_id(self.media1.id)
        assert media_item['filename'] == 'test_image1.jpg'

    def test_create_media(self):
        new_media_data = {
            'filename': 'new_upload.png',
            'filepath': '/uploads/new_upload.png',
            'media_type_id': self.image_type.id,
            'alt_text': 'A new uploaded image'
        }
        media_item = self.media_service.create_media(new_media_data, self.editor.id)
        assert media_item['filename'] == 'new_upload.png'
        assert media_item['uploader_id'] == self.editor.id
        assert Media.query.filter_by(filepath='/uploads/new_upload.png').first() is not None

    def test_create_media_duplicate_filepath(self):
        new_media_data = {
            'filename': 'another_image.jpg',
            'filepath': '/uploads/test_image1.jpg', # Duplicate
            'media_type_id': self.image_type.id
        }
        with pytest.raises(ConflictError):
            self.media_service.create_media(new_media_data, self.admin.id)

    def test_update_media(self):
        update_data = {'alt_text': 'Updated alt text'}
        updated_media = self.media_service.update_media(self.media1.id, update_data, self.admin.id) # Admin is uploader
        assert updated_media['alt_text'] == 'Updated alt text'
        assert Media.query.get(self.media1.id).alt_text == 'Updated alt text'

    def test_update_media_not_found(self):
        with pytest.raises(NotFoundError):
            self.media_service.update_media(9999, {'filename': 'nonexistent.jpg'}, self.admin.id)

    def test_delete_media(self):
        media_to_delete = Media(filename='del.gif', filepath='/uploads/del.gif', uploader_id=self.admin.id, media_type_id=self.image_type.id)
        db.session.add(media_to_delete)
        db.session.commit()
        
        result = self.media_service.delete_media(media_to_delete.id, self.admin.id)
        assert "deleted successfully" in result['message']
        assert Media.query.get(media_to_delete.id) is None

    def test_delete_media_associated_with_post(self):
        # media1 is associated with post1
        with pytest.raises(ConflictError):
            self.media_service.delete_media(self.media1.id, self.admin.id) # Admin is uploader, but it's associated

    def test_get_all_media_types(self):
        media_types = self.media_service.get_all_media_types()
        assert len(media_types) >= 3 # image, video, document

    def test_get_media_type_by_id(self):
        media_type = self.media_service.get_media_type_by_id(self.image_type.id)
        assert media_type['name'] == 'image'

```