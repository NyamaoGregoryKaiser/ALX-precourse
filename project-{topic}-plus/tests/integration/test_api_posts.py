```python
import pytest
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.models.media import Media
from app.extensions import db

@pytest.mark.usefixtures("app", "client", "session", "auth_tokens")
class TestPostAPI:
    def setup_method(self):
        self.admin_user = User.query.filter_by(username='admin_test').first()
        self.editor_user = User.query.filter_by(username='editor_test').first()
        self.regular_user = User.query.filter_by(username='user_test').first()
        self.category1 = Category.query.filter_by(slug='technology').first()
        self.category2 = Category.query.filter_by(slug='lifestyle').first()
        self.post_admin = Post.query.filter_by(slug='admin-post').first()
        self.post_editor_draft = Post.query.filter_by(slug='editor-draft').first()
        self.post_user_published = Post.query.filter_by(slug='published-post').first()
        self.media1 = Media.query.filter_by(filename='test_image1.jpg').first() # Associated with post_admin

    def test_get_all_posts_public(self, client):
        response = client.get('/api/posts')
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) >= 3

    def test_get_all_posts_filter_status(self, client):
        response = client.get(f'/api/posts?status={PostStatus.PUBLISHED.value}')
        assert response.status_code == 200
        assert all(p['status'] == PostStatus.PUBLISHED.value for p in response.json)
        assert any(p['slug'] == 'admin-post' for p in response.json)
        assert any(p['slug'] == 'published-post' for p in response.json)
        assert not any(p['slug'] == 'editor-draft' for p in response.json)

    def test_get_post_by_id_public(self, client):
        response = client.get(f'/api/posts/{self.post_admin.id}')
        assert response.status_code == 200
        assert response.json['title'] == 'Admin Post'
        assert response.json['author']['username'] == 'admin_test'
        assert response.json['category']['name'] == 'Technology'
        assert any(m['id'] == self.media1.id for m in response.json['media_assets'])


    def test_get_post_by_id_not_found(self, client):
        response = client.get('/api/posts/9999')
        assert response.status_code == 404
        assert 'not found' in response.json['message']

    def test_create_post_as_editor_success(self, client, auth_tokens):
        data = {
            'title': 'New Post by Editor',
            'slug': 'new-post-by-editor',
            'content': 'Content of the new post.',
            'category_id': self.category2.id,
            'status': PostStatus.DRAFT.value
        }
        response = client.post('/api/posts', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 201
        assert response.json['title'] == 'New Post by Editor'
        assert response.json['author_id'] == self.editor_user.id
        assert Post.query.filter_by(slug='new-post-by-editor').first() is not None

    def test_create_post_as_regular_user_forbidden(self, client, auth_tokens):
        data = {
            'title': 'Forbidden Post',
            'slug': 'forbidden-post',
            'content': 'Attempt to create.'
        }
        response = client.post('/api/posts', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_create_post_duplicate_slug_conflict(self, client, auth_tokens):
        data = {
            'title': 'Another Admin Post',
            'slug': 'admin-post', # Duplicate
            'content': 'More content.'
        }
        response = client.post('/api/posts', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 409
        assert 'already exists' in response.json['message']

    def test_update_own_post_as_editor_success(self, client, auth_tokens):
        update_data = {
            'title': 'Updated Editor Draft',
            'status': PostStatus.PUBLISHED.value
        }
        response = client.put(f'/api/posts/{self.post_editor_draft.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['title'] == 'Updated Editor Draft'
        assert response.json['status'] == PostStatus.PUBLISHED.value
        assert Post.query.get(self.post_editor_draft.id).title == 'Updated Editor Draft'

    def test_update_other_user_post_as_editor_forbidden(self, client, auth_tokens):
        update_data = {'title': 'Forbidden Update'}
        response = client.put(f'/api/posts/{self.post_admin.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_update_user_published_post_as_admin_success(self, client, auth_tokens):
        update_data = {'content': 'Admin approved content.'}
        response = client.put(f'/api/posts/{self.post_user_published.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['content'] == 'Admin approved content.'
        assert Post.query.get(self.post_user_published.id).content == 'Admin approved content.'

    def test_delete_own_post_as_editor_success(self, client, auth_tokens):
        temp_post = Post(title='Temp Post to Delete', slug='temp-post-delete', content='temp', author_id=self.editor_user.id)
        db.session.add(temp_post)
        db.session.commit()
        
        response = client.delete(f'/api/posts/{temp_post.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 200
        assert 'deleted successfully' in response.json['message']
        assert Post.query.get(temp_post.id) is None

    def test_delete_other_user_post_as_editor_forbidden(self, client, auth_tokens):
        response = client.delete(f'/api/posts/{self.post_admin.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_delete_user_post_as_admin_success(self, client, auth_tokens):
        temp_post = Post(title='User Post to Delete', slug='user-post-delete', content='temp', author_id=self.regular_user.id)
        db.session.add(temp_post)
        db.session.commit()
        
        response = client.delete(f'/api/posts/{temp_post.id}', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert 'deleted successfully' in response.json['message']
        assert Post.query.get(temp_post.id) is None

    def test_associate_media_to_post_as_editor_success(self, client, auth_tokens):
        media_to_add = Media(filename='new_media_for_post.jpg', filepath='/uploads/new_media_for_post.jpg', uploader_id=self.editor_user.id, media_type_id=self.media1.media_type_id)
        db.session.add(media_to_add)
        db.session.commit()

        post_to_update = Post.query.get(self.post_editor_draft.id)
        assert media_to_add not in post_to_update.media_assets

        response = client.post(f'/api/posts/{self.post_editor_draft.id}/media/{media_to_add.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 200
        assert any(m['id'] == media_to_add.id for m in response.json['media_assets'])
        assert media_to_add in Post.query.get(self.post_editor_draft.id).media_assets

    def test_associate_media_to_post_forbidden_by_regular_user(self, client, auth_tokens):
        response = client.post(f'/api/posts/{self.post_editor_draft.id}/media/{self.media1.id}', headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_disassociate_media_from_post_as_admin_success(self, client, auth_tokens):
        # self.post_admin already has self.media1 associated
        post_obj = Post.query.get(self.post_admin.id)
        assert self.media1 in post_obj.media_assets

        response = client.delete(f'/api/posts/{self.post_admin.id}/media/{self.media1.id}', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert not any(m['id'] == self.media1.id for m in response.json['media_assets'])
        assert self.media1 not in Post.query.get(self.post_admin.id).media_assets

    def test_disassociate_media_from_post_not_associated_bad_request(self, client, auth_tokens):
        # self.post_editor_draft does not have self.media1 associated
        response = client.delete(f'/api/posts/{self.post_editor_draft.id}/media/{self.media1.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 400
        assert 'not associated' in response.json['message']

```