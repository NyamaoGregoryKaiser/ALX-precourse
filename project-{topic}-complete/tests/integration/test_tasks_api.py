```python
import pytest
from app.models.task import Task
from app.models.comment import Comment

@pytest.mark.usefixtures('init_database')
def test_create_task_success(client, auth_tokens, sample_projects):
    project_id = sample_projects['project1'].id
    response = client.post('/api/tasks/', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    }, json={
        'title': 'New Task for Project1',
        'description': 'Description for new task',
        'project_id': project_id,
        'assigned_to_id': auth_tokens['user_id']
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['title'] == 'New Task for Project1'
    assert data['project_id'] == project_id
    assert data['creator_id'] == auth_tokens['user_id'] # Defaults to current user

@pytest.mark.usefixtures('init_database')
def test_create_task_invalid_project(client, auth_tokens):
    response = client.post('/api/tasks/', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    }, json={
        'title': 'Task for Non-existent Project',
        'project_id': 9999,
        'creator_id': auth_tokens['user_id']
    })
    assert response.status_code == 400
    assert 'Project with ID \'9999\' not found.' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_get_all_tasks_success(client, auth_tokens, sample_tasks):
    response = client.get('/api/tasks/', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'tasks' in data
    assert data['total'] >= 3 # From sample_tasks fixture

@pytest.mark.usefixtures('init_database')
def test_get_task_by_id_success(client, auth_tokens, sample_tasks):
    task_id = sample_tasks['task1'].id
    response = client.get(f'/api/tasks/{task_id}', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == task_id
    assert data['title'] == sample_tasks['task1'].title

@pytest.mark.usefixtures('init_database')
def test_get_task_by_id_not_found(client, auth_tokens):
    response = client.get('/api/tasks/9999', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 404
    assert 'Task with ID \'9999\' not found.' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_update_task_as_creator_success(client, auth_tokens, sample_tasks, sample_users):
    task = sample_tasks['task2'] # creator_id = user1.id
    user1_token = client.post('/api/auth/login', json={'username': sample_users['user1'].username, 'password': 'password'}).get_json()['access_token']

    response = client.put(f'/api/tasks/{task.id}', headers={
        'Authorization': f'Bearer {user1_token}'
    }, json={
        'status': 'review',
        'priority': 'urgent'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'review'
    assert data['priority'] == 'urgent'

@pytest.mark.usefixtures('init_database')
def test_update_task_as_admin_success(client, auth_tokens, sample_tasks):
    task = sample_tasks['task1']
    response = client.put(f'/api/tasks/{task.id}', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    }, json={
        'status': 'done'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'done'

@pytest.mark.usefixtures('init_database')
def test_update_task_as_project_manager_success(client, auth_tokens, sample_tasks, sample_users):
    task = sample_tasks['task1'] # project1, manager_id = manager.id
    manager_token = client.post('/api/auth/login', json={'username': sample_users['manager'].username, 'password': 'password'}).get_json()['access_token']
    
    response = client.put(f'/api/tasks/{task.id}', headers={
        'Authorization': f'Bearer {manager_token}'
    }, json={
        'description': 'Updated by project manager'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['description'] == 'Updated by project manager'

@pytest.mark.usefixtures('init_database')
def test_update_task_unauthorized(client, auth_tokens, sample_tasks, sample_users):
    task = sample_tasks['task1'] # creator_id = manager.id, assigned_to_id = user1.id
    # Attempt to update by user2, who is neither creator, assignee, nor project manager, nor admin
    user2_token = client.post('/api/auth/login', json={'username': sample_users['user2'].username, 'password': 'password'}).get_json()['access_token']

    response = client.put(f'/api/tasks/{task.id}', headers={
        'Authorization': f'Bearer {user2_token}'
    }, json={
        'status': 'blocked'
    })
    assert response.status_code == 403
    assert 'not authorized' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_delete_task_as_admin_success(client, auth_tokens, sample_tasks):
    task_id = sample_tasks['task3'].id
    response = client.delete(f'/api/tasks/{task_id}', headers={
        'Authorization': f'Bearer {auth_tokens["admin_token"]}'
    })
    assert response.status_code == 204
    assert Task.query.get(task_id) is None

@pytest.mark.usefixtures('init_database')
def test_delete_task_unauthorized(client, auth_tokens, sample_tasks, sample_users):
    task_id = sample_tasks['task3'].id # creator_id = admin.id, assigned_to_id = user1.id
    # Attempt to delete by user2
    user2_token = client.post('/api/auth/login', json={'username': sample_users['user2'].username, 'password': 'password'}).get_json()['access_token']

    response = client.delete(f'/api/tasks/{task_id}', headers={
        'Authorization': f'Bearer {user2_token}'
    })
    assert response.status_code == 403
    assert 'not authorized' in response.get_json()['message']

# Comment API tests
@pytest.mark.usefixtures('init_database')
def test_add_comment_to_task_success(client, auth_tokens, sample_tasks):
    task_id = sample_tasks['task1'].id
    response = client.post(f'/api/tasks/{task_id}/comments', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    }, json={
        'content': 'This is a new comment from a test user.'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['content'] == 'This is a new comment from a test user.'
    assert data['task_id'] == task_id
    assert data['author_id'] == auth_tokens['user_id']

@pytest.mark.usefixtures('init_database')
def test_get_task_comments_success(client, auth_tokens, sample_tasks, sample_comments):
    task_id = sample_tasks['task1'].id
    response = client.get(f'/api/tasks/{task_id}/comments', headers={
        'Authorization': f'Bearer {auth_tokens["user_token"]}'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'comments' in data
    assert data['total'] >= 2 # From fixture

@pytest.mark.usefixtures('init_database')
def test_update_comment_success_as_author(client, auth_tokens, sample_comments):
    comment = sample_comments['comment1'] # author_id = user1.id
    user1_token = client.post('/api/auth/login', json={'username': 'userone', 'password': 'password'}).get_json()['access_token']

    response = client.put(f'/api/tasks/comments/{comment.id}', headers={
        'Authorization': f'Bearer {user1_token}'
    }, json={
        'content': 'Updated content by author.'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['content'] == 'Updated content by author.'

@pytest.mark.usefixtures('init_database')
def test_update_comment_unauthorized(client, auth_tokens, sample_comments, sample_users):
    comment = sample_comments['comment1'] # author_id = user1.id
    user2_token = client.post('/api/auth/login', json={'username': sample_users['user2'].username, 'password': 'password'}).get_json()['access_token']

    response = client.put(f'/api/tasks/comments/{comment.id}', headers={
        'Authorization': f'Bearer {user2_token}'
    }, json={
        'content': 'Attempted update by unauthorized user.'
    })
    assert response.status_code == 403
    assert 'not authorized' in response.get_json()['message']

@pytest.mark.usefixtures('init_database')
def test_delete_comment_success_as_author(client, auth_tokens, sample_comments, sample_users):
    comment = sample_comments['comment1'] # author_id = user1.id
    user1_token = client.post('/api/auth/login', json={'username': 'userone', 'password': 'password'}).get_json()['access_token']

    response = client.delete(f'/api/tasks/comments/{comment.id}', headers={
        'Authorization': f'Bearer {user1_token}'
    })
    assert response.status_code == 204
    assert Comment.query.get(comment.id) is None

@pytest.mark.usefixtures('init_database')
def test_delete_comment_unauthorized(client, auth_tokens, sample_comments, sample_users):
    comment = sample_comments['comment1'] # author_id = user1.id
    user2_token = client.post('/api/auth/login', json={'username': sample_users['user2'].username, 'password': 'password'}).get_json()['access_token']

    response = client.delete(f'/api/tasks/comments/{comment.id}', headers={
        'Authorization': f'Bearer {user2_token}'
    })
    assert response.status_code == 403
    assert 'not authorized' in response.get_json()['message']

```