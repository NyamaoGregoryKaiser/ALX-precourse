import pytest
from app.models import Visualization, DataSource, User
from app.extensions import db
from unittest.mock import patch, MagicMock
import pandas as pd

@pytest.fixture
def mock_visualization_service(mocker):
    """Mocks the visualization_service instance."""
    mock_service = mocker.patch('app.api.visualizations.visualization_service', autospec=True)
    # Default return for processed data
    mock_service.get_processed_visualization_data.return_value = [{'x': 'A', 'y': 10}, {'x': 'B', 'y': 20}]
    return mock_service

# --- GET /visualizations ---
def test_get_visualizations_list_success(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test fetching a list of visualizations for the authenticated user."""
    ds = create_data_source(user=test_user)
    viz1 = create_visualization(user=test_user, ds=ds, name='User Viz 1')
    viz2 = create_visualization(user=test_user, ds=ds, name='User Viz 2')

    # Create a visualization for another user, should not appear
    other_user = User(username='other_viz_user', email='other_viz@example.com')
    other_user.set_password('pass')
    db.session.add(other_user)
    db.session.commit()
    other_ds = create_data_source(user=other_user, name='Other DS')
    create_visualization(user=other_user, ds=other_ds, name='Other User Viz')

    response = client.get('/visualizations/', headers=auth_headers)
    assert response.status_code == 200
    data = response.json
    assert len(data) == 2
    assert {v['name'] for v in data} == {'User Viz 1', 'User Viz 2'}

def test_get_visualizations_list_unauthorized(client):
    """Test fetching visualizations without authentication."""
    response = client.get('/visualizations/')
    assert response.status_code == 401

# --- POST /visualizations ---
def test_create_visualization_success(client, auth_headers, test_user, create_data_source):
    """Test creating a new visualization."""
    ds = create_data_source(user=test_user)
    data = {
        'name': 'New Viz',
        'description': 'A new bar chart',
        'type': 'bar',
        'config_json': {"chart_type": "bar", "x_axis": "category", "y_axis": "value"},
        'data_source_id': ds.id
    }
    response = client.post('/visualizations/', headers=auth_headers, json=data)
    assert response.status_code == 201
    assert response.json['name'] == 'New Viz'
    assert response.json['type'] == 'bar'
    assert response.json['data_source_id'] == ds.id
    assert response.json['user_id'] == test_user.id

    # Verify in DB
    viz = Visualization.query.filter_by(name='New Viz').first()
    assert viz is not None
    assert viz.config_json == data['config_json']

def test_create_visualization_invalid_data_fails(client, auth_headers, create_data_source):
    """Test creating visualization with invalid data (e.g., missing required fields)."""
    ds = create_data_source()
    data = {
        'name': 'Invalid Viz',
        # 'type': 'missing_type', # Missing required type
        'config_json': {},
        'data_source_id': ds.id
    }
    response = client.post('/visualizations/', headers=auth_headers, json=data)
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'type' in response.json['errors']

def test_create_visualization_non_existent_data_source_fails(client, auth_headers):
    """Test creating visualization with a non-existent data source."""
    data = {
        'name': 'Viz Bad DS',
        'type': 'bar',
        'config_json': {"chart_type": "bar"},
        'data_source_id': 99999 # Non-existent
    }
    response = client.post('/visualizations/', headers=auth_headers, json=data)
    assert response.status_code == 404
    assert 'Data source with ID 99999 not found.' in response.json['message']

def test_create_visualization_forbidden_data_source_fails(client, auth_headers, admin_user, create_data_source):
    """Test creating visualization using another user's data source."""
    admin_ds = create_data_source(user=admin_user, name='Admin DS') # Admin's data source
    data = {
        'name': 'Viz Forbidden DS',
        'type': 'bar',
        'config_json': {"chart_type": "bar"},
        'data_source_id': admin_ds.id
    }
    response = client.post('/visualizations/', headers=auth_headers, json=data)
    assert response.status_code == 403
    assert 'You do not have access to the specified data source.' in response.json['message']

def test_create_visualization_duplicate_name_fails(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test creating a visualization with a duplicate name for the same user."""
    ds = create_data_source(user=test_user)
    create_visualization(user=test_user, ds=ds, name='Existing Viz Name')
    data = {
        'name': 'Existing Viz Name',
        'type': 'line',
        'config_json': {"chart_type": "line"},
        'data_source_id': ds.id
    }
    response = client.post('/visualizations/', headers=auth_headers, json=data)
    assert response.status_code == 409
    assert 'already exists for this user' in response.json['message']

# --- GET /visualizations/<int:viz_id> ---
def test_get_visualization_by_id_success(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test fetching a single visualization by ID."""
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds, name='Fetchable Viz')
    response = client.get(f'/visualizations/{viz.id}', headers=auth_headers)
    assert response.status_code == 200
    assert response.json['id'] == viz.id
    assert response.json['name'] == 'Fetchable Viz'

def test_get_visualization_by_id_not_found(client, auth_headers):
    """Test fetching a non-existent visualization."""
    response = client.get('/visualizations/999', headers=auth_headers)
    assert response.status_code == 404

def test_get_visualization_by_id_forbidden(client, auth_headers, admin_user, create_data_source, create_visualization):
    """Test fetching another user's visualization."""
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin, name='Admin Viz')
    response = client.get(f'/visualizations/{viz_admin.id}', headers=auth_headers) # Test user tries to access
    assert response.status_code == 403

# --- PUT /visualizations/<int:viz_id> ---
def test_update_visualization_success(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test updating an existing visualization."""
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds, name='Updatable Viz')
    update_data = {
        'name': 'Updated Viz Name',
        'description': 'New description',
        'config_json': {"chart_type": "line", "x_axis": "date", "y_axis": "amount"}
    }
    response = client.put(f'/visualizations/{viz.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Viz Name'
    assert response.json['description'] == 'New description'
    assert response.json['config_json']['chart_type'] == 'line'
    
    updated_viz = Visualization.query.get(viz.id)
    assert updated_viz.name == 'Updated Viz Name'
    assert updated_viz.description == 'New description'

def test_update_visualization_forbidden(client, auth_headers, admin_user, create_data_source, create_visualization):
    """Test updating another user's visualization."""
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin, name='Admin Viz')
    update_data = {'name': 'Attempted Update'}
    response = client.put(f'/visualizations/{viz_admin.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 403

def test_update_visualization_new_data_source_validation(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test updating data_source_id to a valid new source."""
    ds1 = create_data_source(user=test_user, name='DS1')
    ds2 = create_data_source(user=test_user, name='DS2')
    viz = create_visualization(user=test_user, ds=ds1, name='Viz Using DS1')

    update_data = {'data_source_id': ds2.id}
    response = client.put(f'/visualizations/{viz.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 200
    assert response.json['data_source_id'] == ds2.id

    updated_viz = Visualization.query.get(viz.id)
    assert updated_viz.data_source_id == ds2.id

def test_update_visualization_new_data_source_forbidden_fails(client, auth_headers, test_user, admin_user, create_data_source, create_visualization):
    """Test updating data_source_id to another user's data source."""
    ds_user = create_data_source(user=test_user, name='DS_User')
    ds_admin = create_data_source(user=admin_user, name='DS_Admin')
    viz = create_visualization(user=test_user, ds=ds_user, name='Viz Using DS_User')

    update_data = {'data_source_id': ds_admin.id}
    response = client.put(f'/visualizations/{viz.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 403
    assert 'You do not have access to the new specified data source.' in response.json['message']

# --- DELETE /visualizations/<int:viz_id> ---
def test_delete_visualization_success(client, auth_headers, test_user, create_data_source, create_visualization):
    """Test deleting an existing visualization."""
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds, name='Deletable Viz')
    response = client.delete(f'/visualizations/{viz.id}', headers=auth_headers)
    assert response.status_code == 204
    assert Visualization.query.get(viz.id) is None

def test_delete_visualization_forbidden(client, auth_headers, admin_user, create_data_source, create_visualization):
    """Test deleting another user's visualization."""
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin, name='Admin Viz')
    response = client.delete(f'/visualizations/{viz_admin.id}', headers=auth_headers)
    assert response.status_code == 403

# --- GET /visualizations/<int:viz_id>/data ---
def test_get_visualization_data_success(client, auth_headers, test_user, create_data_source, create_visualization, mock_visualization_service):
    """Test fetching processed data for a visualization."""
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds, name='Data Viz')

    response = client.get(f'/visualizations/{viz.id}/data', headers=auth_headers)
    assert response.status_code == 200
    assert response.json['data'] == mock_visualization_service.get_processed_visualization_data.return_value
    mock_visualization_service.get_processed_visualization_data.assert_called_once_with(viz.id, test_user.id)

def test_get_visualization_data_not_found(client, auth_headers, mock_visualization_service):
    """Test fetching data for a non-existent visualization."""
    mock_visualization_service.get_processed_visualization_data.side_effect = MagicMock(side_effect=lambda viz_id, user_id: (_ for _ in ()).throw(NotFoundError("Visualization not found.")))
    response = client.get('/visualizations/999/data', headers=auth_headers)
    assert response.status_code == 404
    assert 'Visualization not found.' in response.json['message']

def test_get_visualization_data_forbidden(client, auth_headers, admin_user, create_data_source, create_visualization, mock_visualization_service):
    """Test fetching data for another user's visualization without proper authorization."""
    ds_admin = create_data_source(user=admin_user)
    viz_admin = create_visualization(user=admin_user, ds=ds_admin, name='Admin Data Viz')
    
    mock_visualization_service.get_processed_visualization_data.side_effect = MagicMock(side_effect=lambda viz_id, user_id: (_ for _ in ()).throw(ForbiddenError("You do not have permission to access the data for this visualization.")))
    
    response = client.get(f'/visualizations/{viz_admin.id}/data', headers=auth_headers) # Test user tries to access
    assert response.status_code == 403
    assert 'You do not have permission to access the data for this visualization.' in response.json['message']