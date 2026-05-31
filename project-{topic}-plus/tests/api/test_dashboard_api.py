import pytest
from app.models import Dashboard, Visualization, DashboardVisualization, User, DataSource
from app.extensions import db
import json

# --- GET /dashboards ---
def test_get_dashboards_list_success(client, auth_headers, test_user, create_dashboard):
    """Test fetching a list of dashboards for the authenticated user."""
    dash1 = create_dashboard(user=test_user, name='User Dashboard 1')
    dash2 = create_dashboard(user=test_user, name='User Dashboard 2')

    # Create a dashboard for another user, should not appear
    other_user = User(username='other_dash_user', email='other_dash@example.com')
    other_user.set_password('pass')
    db.session.add(other_user)
    db.session.commit()
    create_dashboard(user=other_user, name='Other User Dashboard')

    response = client.get('/dashboards/', headers=auth_headers)
    assert response.status_code == 200
    data = response.json
    assert len(data) == 2
    assert {d['name'] for d in data} == {'User Dashboard 1', 'User Dashboard 2'}

def test_get_dashboards_list_unauthorized(client):
    """Test fetching dashboards without authentication."""
    response = client.get('/dashboards/')
    assert response.status_code == 401

# --- POST /dashboards ---
def test_create_dashboard_success(client, auth_headers, test_user):
    """Test creating a new dashboard."""
    data = {
        'name': 'New Dashboard',
        'description': 'A fantastic new dashboard',
        'layout_json': {"rows": 12, "cols": 12}
    }
    response = client.post('/dashboards/', headers=auth_headers, json=data)
    assert response.status_code == 201
    assert response.json['name'] == 'New Dashboard'
    assert response.json['description'] == 'A fantastic new dashboard'
    assert response.json['user_id'] == test_user.id

    # Verify in DB
    dash = Dashboard.query.filter_by(name='New Dashboard').first()
    assert dash is not None
    assert dash.layout_json == data['layout_json']

def test_create_dashboard_invalid_data_fails(client, auth_headers):
    """Test creating dashboard with invalid data (e.g., missing name)."""
    data = {
        'description': 'Description without name',
        'layout_json': {}
    }
    response = client.post('/dashboards/', headers=auth_headers, json=data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'name' in response.json['errors']

def test_create_dashboard_duplicate_name_fails(client, auth_headers, test_user, create_dashboard):
    """Test creating a dashboard with a duplicate name for the same user."""
    create_dashboard(user=test_user, name='Existing Dashboard Name')
    data = {
        'name': 'Existing Dashboard Name',
        'description': 'Another dashboard with same name',
        'layout_json': {}
    }
    response = client.post('/dashboards/', headers=auth_headers, json=data)
    assert response.status_code == 409
    assert 'already exists for this user' in response.json['message']

# --- GET /dashboards/<int:dash_id> ---
def test_get_dashboard_by_id_success(client, auth_headers, test_user, create_dashboard, create_data_source, create_visualization):
    """Test fetching a single dashboard by ID, including its visualizations."""
    ds = create_data_source(user=test_user)
    viz1 = create_visualization(user=test_user, ds=ds, name='Dashboard Viz 1')
    viz2 = create_visualization(user=test_user, ds=ds, name='Dashboard Viz 2')
    dash = create_dashboard(user=test_user, name='Fetchable Dashboard')

    # Add visualizations to dashboard
    db.session.add(DashboardVisualization(dashboard=dash, visualization=viz1, position_x=0, position_y=0, width=6, height=4))
    db.session.add(DashboardVisualization(dashboard=dash, visualization=viz2, position_x=6, position_y=0, width=6, height=4))
    db.session.commit()

    response = client.get(f'/dashboards/{dash.id}', headers=auth_headers)
    assert response.status_code == 200
    assert response.json['id'] == dash.id
    assert response.json['name'] == 'Fetchable Dashboard'
    assert 'visualizations' in response.json
    assert len(response.json['visualizations']) == 2
    assert {v['visualization']['name'] for v in response.json['visualizations']} == {'Dashboard Viz 1', 'Dashboard Viz 2'}

def test_get_dashboard_by_id_not_found(client, auth_headers):
    """Test fetching a non-existent dashboard."""
    response = client.get('/dashboards/999', headers=auth_headers)
    assert response.status_code == 404

def test_get_dashboard_by_id_forbidden(client, auth_headers, admin_user, create_dashboard):
    """Test fetching another user's dashboard."""
    dash_admin = create_dashboard(user=admin_user, name='Admin Dashboard') # Admin's dashboard
    response = client.get(f'/dashboards/{dash_admin.id}', headers=auth_headers) # Test user tries to access
    assert response.status_code == 403

# --- PUT /dashboards/<int:dash_id> ---
def test_update_dashboard_success(client, auth_headers, test_user, create_dashboard):
    """Test updating an existing dashboard."""
    dash = create_dashboard(user=test_user, name='Updatable Dashboard')
    update_data = {
        'name': 'Updated Dashboard Name',
        'description': 'New description for dashboard',
        'layout_json': {"theme": "dark"}
    }
    response = client.put(f'/dashboards/{dash.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Dashboard Name'
    assert response.json['description'] == 'New description for dashboard'
    assert response.json['layout_json']['theme'] == 'dark'
    
    updated_dash = Dashboard.query.get(dash.id)
    assert updated_dash.name == 'Updated Dashboard Name'
    assert updated_dash.description == 'New description for dashboard'

def test_update_dashboard_forbidden(client, auth_headers, admin_user, create_dashboard):
    """Test updating another user's dashboard."""
    dash_admin = create_dashboard(user=admin_user, name='Admin Dashboard')
    update_data = {'name': 'Attempted Update'}
    response = client.put(f'/dashboards/{dash_admin.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 403

# --- DELETE /dashboards/<int:dash_id> ---
def test_delete_dashboard_success(client, auth_headers, test_user, create_dashboard):
    """Test deleting an existing dashboard."""
    dash = create_dashboard(user=test_user, name='Deletable Dashboard')
    response = client.delete(f'/dashboards/{dash.id}', headers=auth_headers)
    assert response.status_code == 204
    assert Dashboard.query.get(dash.id) is None

def test_delete_dashboard_forbidden(client, auth_headers, admin_user, create_dashboard):
    """Test deleting another user's dashboard."""
    dash_admin = create_dashboard(user=admin_user, name='Admin Dashboard')
    response = client.delete(f'/dashboards/{dash_admin.id}', headers=auth_headers)
    assert response.status_code == 403

# --- POST /dashboards/<int:dash_id>/visualizations ---
def test_add_visualization_to_dashboard_success(client, auth_headers, test_user, create_dashboard, create_data_source, create_visualization):
    """Test adding a visualization to a dashboard."""
    dash = create_dashboard(user=test_user)
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds)
    
    data = {
        'visualization_id': viz.id,
        'position_x': 0, 'position_y': 0, 'width': 6, 'height': 4
    }
    response = client.post(f'/dashboards/{dash.id}/visualizations', headers=auth_headers, json=data)
    assert response.status_code == 201
    assert response.json['visualization_id'] == viz.id
    assert response.json['dashboard_id'] == dash.id
    assert response.json['position_x'] == 0

    # Verify association in DB
    dash_viz = DashboardVisualization.query.get((dash.id, viz.id))
    assert dash_viz is not None

def test_add_visualization_to_dashboard_dashboard_not_found(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test adding visualization to a non-existent dashboard."""
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds)
    data = {
        'visualization_id': viz.id,
        'position_x': 0, 'position_y': 0, 'width': 6, 'height': 4
    }
    response = client.post('/dashboards/999/visualizations', headers=auth_headers, json=data)
    assert response.status_code == 404

def test_add_visualization_to_dashboard_visualization_not_found(client, auth_headers, test_user, create_dashboard):
    """Test adding a non-existent visualization to a dashboard."""
    dash = create_dashboard(user=test_user)
    data = {
        'visualization_id': 999,
        'position_x': 0, 'position_y': 0, 'width': 6, 'height': 4
    }
    response = client.post(f'/dashboards/{dash.id}/visualizations', headers=auth_headers, json=data)
    assert response.status_code == 404
    assert 'Visualization with ID 999 not found.' in response.json['message']

def test_add_visualization_to_dashboard_forbidden_visualization(client, auth_headers, test_user, admin_user, create_dashboard, create_data_source, create_visualization):
    """Test adding another user's visualization to a dashboard."""
    dash = create_dashboard(user=test_user)
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin)
    data = {
        'visualization_id': viz_admin.id,
        'position_x': 0, 'position_y': 0, 'width': 6, 'height': 4
    }
    response = client.post(f'/dashboards/{dash.id}/visualizations', headers=auth_headers, json=data)
    assert response.status_code == 403
    assert 'You do not have permission to add this visualization' in response.json['message']

def test_add_visualization_to_dashboard_already_exists(client, auth_headers, test_user, create_dashboard, create_data_source, create_visualization):
    """Test adding an already associated visualization to a dashboard."""
    dash = create_dashboard(user=test_user)
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds)
    
    # First add
    db.session.add(DashboardVisualization(dashboard=dash, visualization=viz, position_x=0, position_y=0, width=6, height=4))
    db.session.commit()

    # Second attempt to add
    data = {
        'visualization_id': viz.id,
        'position_x': 1, 'position_y': 1, 'width': 7, 'height': 5 # Different pos, but same viz ID
    }
    response = client.post(f'/dashboards/{dash.id}/visualizations', headers=auth_headers, json=data)
    assert response.status_code == 409
    assert 'already on dashboard' in response.json['message']

# --- PUT /dashboards/<int:dash_id>/visualizations/<int:viz_id> ---
def test_update_dashboard_visualization_position_success(client, auth_headers, test_user, create_dashboard, create_data_source, create_visualization):
    """Test updating the position/size of a visualization on a dashboard."""
    dash = create_dashboard(user=test_user)
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds)
    
    dash_viz = DashboardVisualization(dashboard=dash, visualization=viz, position_x=0, position_y=0, width=6, height=4)
    db.session.add(dash_viz)
    db.session.commit()

    update_data = {
        'position_x': 2,
        'position_y': 3,
        'width': 8,
        'height': 5
    }
    response = client.put(f'/dashboards/{dash.id}/visualizations/{viz.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 200
    assert response.json['position_x'] == 2
    assert response.json['position_y'] == 3
    assert response.json['width'] == 8
    assert response.json['height'] == 5

    updated_dash_viz = DashboardVisualization.query.get((dash.id, viz.id))
    assert updated_dash_viz.position_x == 2
    assert updated_dash_viz.position_y == 3

def test_update_dashboard_visualization_position_not_found(client, auth_headers, test_user, create_dashboard):
    """Test updating a non-existent visualization on a dashboard."""
    dash = create_dashboard(user=test_user)
    data = {'position_x': 1}
    response = client.put(f'/dashboards/{dash.id}/visualizations/999', headers=auth_headers, json=data)
    assert response.status_code == 404
    assert 'Visualization 999 not found on dashboard' in response.json['message']

def test_update_dashboard_visualization_position_forbidden_dashboard(client, auth_headers, admin_user, create_dashboard, create_data_source, create_visualization):
    """Test updating visualization on another user's dashboard."""
    dash_admin = create_dashboard(user=admin_user)
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin)
    db.session.add(DashboardVisualization(dashboard=dash_admin, visualization=viz_admin, position_x=0, position_y=0, width=6, height=4))
    db.session.commit()

    data = {'position_x': 10}
    response = client.put(f'/dashboards/{dash_admin.id}/visualizations/{viz_admin.id}', headers=auth_headers, json=data) # Test user tries to update admin's dash
    assert response.status_code == 403

# --- DELETE /dashboards/<int:dash_id>/visualizations/<int:viz_id> ---
def test_remove_visualization_from_dashboard_success(client, auth_headers, test_user, create_dashboard, create_data_source, create_visualization):
    """Test removing a visualization from a dashboard."""
    dash = create_dashboard(user=test_user)
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds)
    
    dash_viz = DashboardVisualization(dashboard=dash, visualization=viz, position_x=0, position_y=0, width=6, height=4)
    db.session.add(dash_viz)
    db.session.commit()

    assert DashboardVisualization.query.get((dash.id, viz.id)) is not None

    response = client.delete(f'/dashboards/{dash.id}/visualizations/{viz.id}', headers=auth_headers)
    assert response.status_code == 204
    assert DashboardVisualization.query.get((dash.id, viz.id)) is None

def test_remove_visualization_from_dashboard_not_found(client, auth_headers, test_user, create_dashboard):
    """Test removing a non-existent visualization from a dashboard."""
    dash = create_dashboard(user=test_user)
    response = client.delete(f'/dashboards/{dash.id}/visualizations/999', headers=auth_headers)
    assert response.status_code == 404
    assert 'Visualization 999 not found on dashboard' in response.json['message']

def test_remove_visualization_from_dashboard_forbidden_dashboard(client, auth_headers, admin_user, create_dashboard, create_data_source, create_visualization):
    """Test removing visualization from another user's dashboard."""
    dash_admin = create_dashboard(user=admin_user)
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin)
    db.session.add(DashboardVisualization(dashboard=dash_admin, visualization=viz_admin, position_x=0, position_y=0, width=6, height=4))
    db.session.commit()

    response = client.delete(f'/dashboards/{dash_admin.id}/visualizations/{viz_admin.id}', headers=auth_headers) # Test user tries to delete from admin's dash
    assert response.status_code == 403