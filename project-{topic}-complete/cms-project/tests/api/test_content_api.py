import pytest
import json
from app.models import Content, Category, Tag, User
from app.extensions import db

def test_create_content_author_success(client, auth_tokens, sample_users, sample_categories, sample_tags):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    author = sample_users['author']
    tech_cat = sample_categories['tech']
    python_tag = sample_tags['python']

    content_data = {
        'title': 'Author New Article',
        'body': 'This is content by an author.',
        'user_id': author.id,
        'category_id': tech_cat.id,
        'tag_ids': [python_tag.id],
        'status': 'draft' # Authors can only create as draft
    }
    response = client.post('/api/v1/content', data=json.dumps(content_data), content_type='application/json', headers=author_headers)
    assert response.status_code == 201
    assert response.json['title'] == 'Author New Article'
    assert response.json['status'] == 'draft' # Should still be draft even if 'published' was requested
    assert response.json['author']['id'] == author.id
    assert response.json['category']['id'] == tech_cat.id
    assert response.json['tags'][0]['id'] == python_tag.id

    content = Content.query.filter_by(slug='author-new-article').first()
    assert content is not None
    assert content.status == 'draft'

def test_create_content_admin_publish_success(client, auth_tokens, sample_users, sample_categories):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    author = sample_users['author']
    food_cat = sample_categories['food']

    content_data = {
        'title': 'Admin Published Article',
        'body': 'This is content directly published by an admin.',
        'user_id': author.id,
        'category_id': food_cat.id,
        'status': 'published',
        'is_featured': True
    }
    response = client.post('/api/v1/content', data=json.dumps(content_data), content_type='application/json', headers=admin_headers)
    assert response.status_code == 201
    assert response.json['title'] == 'Admin Published Article'
    assert response.json['status'] == 'published'
    assert response.json['published_at'] is not None

def test_create_content_author_try_publish_fail(client, auth_tokens, sample_users, sample_categories):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    author = sample_users['author']
    tech_cat = sample_categories['tech']

    content_data = {
        'title': 'Author Trying to Publish',
        'body': 'This content should not be published directly.',
        'user_id': author.id,
        'category_id': tech_cat.id,
        'status': 'published'
    }
    response = client.post('/api/v1/content', data=json.dumps(content_data), content_type='application/json', headers=author_headers)
    assert response.status_code == 201
    assert response.json['status'] == 'draft' # Should be coerced to draft

    content = Content.query.filter_by(slug='author-trying-to-publish').first()
    assert content.status == 'draft'

def test_create_content_invalid_user_id(client, auth_tokens, sample_categories):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    content_data = {
        'title': 'Invalid Author',
        'body': 'Content with invalid author ID.',
        'user_id': 9999, # Non-existent user
        'category_id': sample_categories['tech'].id,
        'status': 'draft'
    }
    response = client.post('/api/v1/content', data=json.dumps(content_data), content_type='application/json', headers=admin_headers)
    assert response.status_code == 400
    assert "Author specified does not exist." in response.json['message']

def test_list_content_public_only_published(client, sample_content):
    response = client.get('/api/v1/content')
    assert response.status_code == 200
    items = response.json['items']
    assert len(items) == 1 # Only published content should be visible
    assert items[0]['slug'] == sample_content['published'].slug

def test_list_content_logged_in_author_sees_own_draft(client, auth_tokens, sample_content):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    response = client.get('/api/v1/content', headers=author_headers)
    assert response.status_code == 200
    items = response.json['items']
    assert len(items) == 2 # Should see both published and own draft
    assert any(item['slug'] == sample_content['published'].slug for item in items)
    assert any(item['slug'] == sample_content['draft'].slug for item in items)

def test_list_content_admin_sees_all_statuses(client, auth_tokens, sample_content):
    admin_headers = {'Authorization': f'Bearer {auth_tokens["admin_token"]}'}
    response = client.get('/api/v1/content', headers=admin_headers)
    assert response.status_code == 200
    items = response.json['items']
    assert len(items) == 2 # Admin sees all
    assert any(item['slug'] == sample_content['published'].slug for item in items)
    assert any(item['slug'] == sample_content['draft'].slug for item in items)

def test_get_content_public_published(client, sample_content):
    response = client.get(f'/api/v1/content/{sample_content["published"].id}')
    assert response.status_code == 200
    assert response.json['slug'] == sample_content['published'].slug

def test_get_content_public_draft_forbidden(client, sample_content):
    response = client.get(f'/api/v1/content/{sample_content["draft"].id}')
    assert response.status_code == 403
    assert "Forbidden: This content is not published." in response.json['message']

def test_get_content_author_own_draft(client, auth_tokens, sample_content):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    response = client.get(f'/api/v1/content/{sample_content["draft"].id}', headers=author_headers)
    assert response.status_code == 200
    assert response.json['slug'] == sample_content['draft'].slug

def test_get_content_editor_any_draft(client, auth_tokens, sample_content):
    editor_headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
    response = client.get(f'/api/v1/content/{sample_content["draft"].id}', headers=editor_headers)
    assert response.status_code == 200
    assert response.json['slug'] == sample_content['draft'].slug

def test_update_content_author_self_success(client, auth_tokens, sample_content):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    published_content = sample_content['published']

    update_data = {
        'title': 'Updated Article Title',
        'body': 'New updated body for the article.'
    }
    response = client.put(f'/api/v1/content/{published_content.id}', data=json.dumps(update_data), content_type='application/json', headers=author_headers)
    assert response.status_code == 200
    assert response.json['title'] == 'Updated Article Title'
    assert response.json['body'] == 'New updated body for the article.'
    assert response.json['slug'] == 'updated-article-title'

def test_update_content_author_try_publish_other_forbidden(client, auth_tokens, sample_users, sample_content):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    # Create a content item by another author for testing cross-user update
    other_author = User(username='other_author', email='other@test.com', role='author')
    other_author.set_password('pass')
    db.session.add(other_author)
    db.session.commit()
    other_content = Content(
        title='Other Author Content', body='Body', user_id=other_author.id, status='draft'
    )
    db.session.add(other_content)
    db.session.commit()

    update_data = {'status': 'published'}
    response = client.put(f'/api/v1/content/{other_content.id}', data=json.dumps(update_data), content_type='application/json', headers=author_headers)
    assert response.status_code == 403
    assert "Forbidden: You can only update your own content." in response.json['message']

def test_update_content_editor_publish_success(client, auth_tokens, sample_content):
    editor_headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
    draft_content = sample_content['draft']

    update_data = {'status': 'published'}
    response = client.put(f'/api/v1/content/{draft_content.id}', data=json.dumps(update_data), content_type='application/json', headers=editor_headers)
    assert response.status_code == 200
    assert response.json['status'] == 'published'
    assert response.json['published_at'] is not None

def test_delete_content_editor_success(client, auth_tokens, sample_content):
    editor_headers = {'Authorization': f'Bearer {auth_tokens["editor_token"]}'}
    published_content_id = sample_content['published'].id

    response = client.delete(f'/api/v1/content/{published_content_id}', headers=editor_headers)
    assert response.status_code == 204
    assert Content.query.get(published_content_id) is None

def test_delete_content_author_forbidden(client, auth_tokens, sample_content):
    author_headers = {'Authorization': f'Bearer {auth_tokens["author_token"]}'}
    published_content_id = sample_content['published'].id

    response = client.delete(f'/api/v1/content/{published_content_id}', headers=author_headers)
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json['message'] # Authors cannot delete
```