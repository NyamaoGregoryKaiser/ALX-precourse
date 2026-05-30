```python
import pytest
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.post import Post, PostStatus
from app.models.media import Media, MediaType
from app.extensions import db

@pytest.mark.usefixtures("app", "client", "session", "auth_tokens")
class TestMediaAPI:
    def setup_method(self):
        self.admin_user = User.query.filter_by(username='admin_test').first()
        self.editor_user = User.query.filter_by(username='editor_test').first()
        self.regular_user = User.query.filter_by(username='user_test').first()
        self.image_type = MediaType.query.filter_by(name='image').first()
        self.video_type = MediaType.query.filter_by(name='video').first()
        self.media_admin_image = Media.query.filter_by(filename='test_image1.jpg').first() # Uploader: admin
        self.media_editor_video = Media.query.filter_by(filename='test_video1.mp4').first() # Uploader: editor
        self.post_admin = Post.query.filter_by(slug='admin-post').first() # Has media_admin_image associated

    # --- Media Item Routes ---
    def test_get_all_media_public(self, client):
        response = client.get('/api/media')
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) >= 2
        assert any(m['filename'] == 'test_image1.jpg' for m in response.json)

    def test_get_all_media_filter_uploader(self, client):
        response = client.get(f'/api/media?uploader_id={self.admin_user.id}')
        assert response.status_code == 200
        assert all(m['uploader_id'] == self.admin_user.id for m in response.json)
        assert any(m['filename'] == 'test_image1.jpg' for m in response.json)

    def test_get_media_by_id_public(self, client):
        response = client.get(f'/api/media/{self.media_editor_video.id}')
        assert response.status_code == 200
        assert response.json['filename'] == 'test_video1.mp4'
        assert response.json['uploader']['username'] == 'editor_test'

    def test_get_media_by_id_not_found(self, client):
        response = client.get('/api/media/9999')
        assert response.status_code == 404
        assert 'not found' in response.json['message']

    def test_create_media_as_admin_success(self, client, auth_tokens):
        data = {
            'filename': 'new_admin_upload.pdf',
            'filepath': '/uploads/admin/new_admin_upload.pdf',
            'media_type_id': MediaType.query.filter_by(name='document').first().id,
            'caption': 'Admin uploaded document.'
        }
        response = client.post('/api/media', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 201
        assert response.json['filename'] == 'new_admin_upload.pdf'
        assert response.json['uploader_id'] == self.admin_user.id
        assert Media.query.filter_by(filepath='/uploads/admin/new_admin_upload.pdf').first() is not None

    def test_create_media_as_regular_user_forbidden(self, client, auth_tokens):
        data = {
            'filename': 'forbidden_upload.jpg',
            'filepath': '/uploads/user/forbidden.jpg',
            'media_type_id': self.image_type.id
        }
        response = client.post('/api/media', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["user"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_create_media_duplicate_filepath_conflict(self, client, auth_tokens):
        data = {
            'filename': 'another_image.jpg',
            'filepath': '/uploads/test_image1.jpg', # Duplicate
            'media_type_id': self.image_type.id
        }
        response = client.post('/api/media', json=data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 409
        assert 'already exists' in response.json['message']

    def test_update_own_media_as_editor_success(self, client, auth_tokens):
        update_data = {
            'alt_text': 'Updated alt text for video.',
            'caption': 'This is a test video.'
        }
        response = client.put(f'/api/media/{self.media_editor_video.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['alt_text'] == 'Updated alt text for video.'
        assert Media.query.get(self.media_editor_video.id).caption == 'This is a test video.'

    def test_update_other_user_media_as_editor_forbidden(self, client, auth_tokens):
        update_data = {'alt_text': 'Forbidden alt text'}
        response = client.put(f'/api/media/{self.media_admin_image.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    def test_update_media_as_admin_success(self, client, auth_tokens):
        update_data = {'filename': 'renamed_video.mp4'}
        response = client.put(f'/api/media/{self.media_editor_video.id}', json=update_data, headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 200
        assert response.json['filename'] == 'renamed_video.mp4'
        assert Media.query.get(self.media_editor_video.id).filename == 'renamed_video.mp4'

    def test_delete_own_media_as_editor_success(self, client, auth_tokens):
        temp_media = Media(filename='temp_image.gif', filepath='/uploads/editor/temp.gif', uploader_id=self.editor_user.id, media_type_id=self.image_type.id)
        db.session.add(temp_media)
        db.session.commit()
        
        response = client.delete(f'/api/media/{temp_media.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 200
        assert 'deleted successfully' in response.json['message']
        assert Media.query.get(temp_media.id) is None

    def test_delete_media_associated_with_post_conflict(self, client, auth_tokens):
        # self.media_admin_image is associated with self.post_admin
        response = client.delete(f'/api/media/{self.media_admin_image.id}', headers={
            'Authorization': f'Bearer {auth_tokens["admin"]["access"]}'
        })
        assert response.status_code == 409
        assert 'associated with existing posts' in response.json['message']

    def test_delete_other_user_media_as_editor_forbidden(self, client, auth_tokens):
        response = client.delete(f'/api/media/{self.media_admin_image.id}', headers={
            'Authorization': f'Bearer {auth_tokens["editor"]["access"]}'
        })
        assert response.status_code == 403
        assert 'Forbidden' in response.json['message']

    # --- Media Type Routes ---
    def test_get_all_media_types_public(self, client):
        response = client.get('/api/media/types')
        assert response.status_code == 200
        assert isinstance(response.json, list)
        assert len(response.json) >= 3
        assert any(mt['name'] == 'image' for mt in response.json)

    def test_get_media_type_by_id_public(self, client):
        response = client.get(f'/api/media/types/{self.video_type.id}')
        assert response.status_code == 200
        assert response.json['name'] == 'video'

    def test_get_media_type_by_id_not_found(self, client):
        response = client.get('/api/media/types/9999')
        assert response.status_code == 404
        assert 'not found' in response.json['message']

```