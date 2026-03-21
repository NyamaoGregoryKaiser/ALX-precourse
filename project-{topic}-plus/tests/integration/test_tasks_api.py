import pytest
from app.models import Task, TaskStatus
from datetime import datetime, timedelta

def test_create_task_success(client, user1_auth_header, seed_users):
    """Authenticated user can create a task."""
    assigned_to_id = seed_users['user2'].id
    due_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    response = client.post('/api/tasks/', headers=user1_auth_header, json={
        'title': 'New Task by User1',
        'description': 'Description of new task',
        'due_date': due_date,
        'assigned_to_id': assigned_to_id
    })
    assert response.status_code == 201
    assert response.json['title'] == 'New Task by User1'
    assert response.json['created_by'] == seed_users['user1'].id
    assert response.json['assigned_to'] == assigned_to_id
    assert Task.query.filter_by(title='New Task by User1').first() is not None

def test_create_task_invalid_data(client, user1_auth_header):
    """Invalid task data returns 400."""
    response = client.post('/api/tasks/', headers=user1_auth_header, json={
        'title': '', # Too short
        'due_date': 'invalid-date'
    })
    assert response.status_code == 400
    assert 'title' in response.json['errors']
    assert 'due_date' in response.json['errors']

def test_create_task_past_due_date(client, user1_auth_header):
    """Creating task with past due date returns 400."""
    past_date = (datetime.utcnow() - timedelta(days=1)).isoformat()
    response = client.post('/api/tasks/', headers=user1_auth_header, json={
        'title': 'Past Due Task',
        'due_date': past_date
    })
    assert response.status_code == 400
    assert response.json['code'] == 'BAD_REQUEST'
    assert 'Due date cannot be in the past' in response.json['message']

def test_get_all_tasks_admin_success(client, admin_auth_header, seed_tasks):
    """Admin can retrieve all tasks."""
    response = client.get('/api/tasks/', headers=admin_auth_header)
    assert response.status_code == 200
    assert response.json['pagination']['total'] == 6
    assert len(response.json['tasks']) == 6

def test_get_all_tasks_user_ownership(client, user1_auth_header, seed_users, seed_tasks):
    """User can only retrieve tasks they created or are assigned to."""
    response = client.get('/api/tasks/', headers=user1_auth_header)
    assert response.status_code == 200
    
    # user1 created task3, task4. Assigned to task2, task3, task5.
    # Total unique tasks for user1: task2, task3, task4, task5 (4 tasks)
    assert response.json['pagination']['total'] == 4
    task_titles = [t['title'] for t in response.json['tasks']]
    assert 'Admin Task 2' in task_titles
    assert 'User1 Task 1' in task_titles
    assert 'User1 Task 2' in task_titles
    assert 'User2 Task 1' in task_titles
    assert 'Admin Task 1' not in task_titles # Admin's task, not assigned to user1

def test_get_all_tasks_with_status_filter(client, admin_auth_header, seed_tasks):
    """Filtering tasks by status."""
    response = client.get('/api/tasks/?status=in_progress', headers=admin_auth_header)
    assert response.status_code == 200
    assert response.json['pagination']['total'] == 2 # task2, task6
    for task in response.json['tasks']:
        assert task['status'] == 'in_progress'

def test_get_task_admin_any_task(client, admin_auth_header, seed_tasks):
    """Admin can get any task."""
    task_id = seed_tasks['task4'].id # User1's task assigned to User2
    response = client.get(f'/api/tasks/{task_id}', headers=admin_auth_header)
    assert response.status_code == 200
    assert response.json['id'] == task_id
    assert response.json['title'] == 'User1 Task 2'

def test_get_task_creator_access(client, user1_auth_header, seed_tasks):
    """Task creator can get their own task."""
    task_id = seed_tasks['task3'].id # User1's task
    response = client.get(f'/api/tasks/{task_id}', headers=user1_auth_header)
    assert response.status_code == 200
    assert response.json['id'] == task_id
    assert response.json['title'] == 'User1 Task 1'

def test_get_task_assignee_access(client, user1_auth_header, seed_tasks):
    """Task assignee can get their assigned task."""
    task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
    response = client.get(f'/api/tasks/{task_id}', headers=user1_auth_header)
    assert response.status_code == 200
    assert response.json['id'] == task_id
    assert response.json['title'] == 'User2 Task 1'

def test_get_task_unauthorized_forbidden(client, user1_auth_header, seed_tasks):
    """Unauthorized user cannot get a task."""
    task_id = seed_tasks['task1'].id # Admin's task, not assigned to user1
    response = client.get(f'/api/tasks/{task_id}', headers=user1_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'

def test_update_task_admin_success(client, admin_auth_header, auth_tokens, seed_tasks):
    """Admin can update any task."""
    task_id = seed_tasks['task4'].id
    response = client.put(f'/api/tasks/{task_id}', headers=admin_auth_header, json={
        'title': 'Admin Updated Task 4',
        'status': 'completed'
    })
    assert response.status_code == 200
    assert response.json['title'] == 'Admin Updated Task 4'
    assert response.json['status'] == 'completed'
    updated_task = Task.query.get(task_id)
    assert updated_task.title == 'Admin Updated Task 4'
    assert updated_task.status == TaskStatus.COMPLETED

def test_update_task_creator_success(client, user1_auth_header, seed_tasks):
    """Task creator can update their own task."""
    task_id = seed_tasks['task3'].id # User1's task
    response = client.put(f'/api/tasks/{task_id}', headers=user1_auth_header, json={
        'description': 'User1 updated description',
        'due_date': (datetime.utcnow() + timedelta(days=10)).isoformat()
    })
    assert response.status_code == 200
    assert response.json['description'] == 'User1 updated description'
    updated_task = Task.query.get(task_id)
    assert updated_task.description == 'User1 updated description'

def test_update_task_assignee_status_only_success(client, user1_auth_header, seed_tasks):
    """Assignee can update only the status of their assigned task."""
    task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
    response = client.put(f'/api/tasks/{task_id}', headers=user1_auth_header, json={
        'status': 'in_progress'
    })
    assert response.status_code == 200
    assert response.json['status'] == 'in_progress'
    updated_task = Task.query.get(task_id)
    assert updated_task.status == TaskStatus.IN_PROGRESS
    assert updated_task.title == seed_tasks['task5'].title # Should not change title

def test_update_task_assignee_core_details_forbidden(client, user1_auth_header, seed_tasks):
    """Assignee cannot update core details (title, description, assignment)."""
    task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
    response = client.put(f'/api/tasks/{task_id}', headers=user1_auth_header, json={
        'title': 'Forbidden by Assignee',
        'description': 'Forbidden Description',
        'assigned_to_id': seed_users['user2'].id # Try to reassign
    })
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
    assert 'not authorized to modify this task\'s core details' in response.json['message']

def test_update_task_unauthorized_user_forbidden(client, user1_auth_header, seed_tasks):
    """Unauthorized user cannot update a task."""
    task_id = seed_tasks['task1'].id # Admin's task
    response = client.put(f'/api/tasks/{task_id}', headers=user1_auth_header, json={
        'status': 'completed'
    })
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'

def test_delete_task_admin_success(client, admin_auth_header, auth_tokens, seed_tasks):
    """Admin can delete any task (fresh token)."""
    task_id = seed_tasks['task4'].id
    response = client.delete(f'/api/tasks/{task_id}', headers={'Authorization': f"Bearer {auth_tokens['admin']['access_token']}"})
    assert response.status_code == 204
    assert Task.query.get(task_id) is None

def test_delete_task_creator_success(client, user1_auth_header, auth_tokens, seed_tasks):
    """Task creator can delete their own task (fresh token)."""
    task_id = seed_tasks['task3'].id # User1's task
    response = client.delete(f'/api/tasks/{task_id}', headers={'Authorization': f"Bearer {auth_tokens['user1']['access_token']}"})
    assert response.status_code == 204
    assert Task.query.get(task_id) is None

def test_delete_task_unauthorized_forbidden(client, user1_auth_header, seed_tasks):
    """Unauthorized user cannot delete a task."""
    task_id = seed_tasks['task1'].id # Admin's task
    response = client.delete(f'/api/tasks/{task_id}', headers=user1_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'

def test_delete_task_assignee_forbidden(client, user1_auth_header, seed_tasks):
    """Assignee cannot delete an assigned task."""
    task_id = seed_tasks['task5'].id # Created by User2, assigned to User1
    response = client.delete(f'/api/tasks/{task_id}', headers=user1_auth_header)
    assert response.status_code == 403
    assert response.json['code'] == 'FORBIDDEN'
```