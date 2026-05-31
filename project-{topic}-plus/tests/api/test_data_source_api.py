import pytest
from app.models import DataSource, User
from app.extensions import db
from io import BytesIO
from unittest.mock import patch, MagicMock
import pandas as pd

@pytest.fixture
def mock_data_processor(mocker):
    """Mocks the data_processor instance for file operations."""
    mock_processor = mocker.patch('app.api.data_sources.data_processor', autospec=True)
    mock_processor.load_file_data.return_value = pd.DataFrame({'col1': [1,2], 'col2': ['A','B']})
    mock_processor.detect_schema.return_value = {"columns": ["col1", "col2"], "rows": 2, "dtypes": {"col1": "int64", "col2": "object"}}
    mock_processor._get_file_type_from_filename.return_value = 'csv' # Default for many tests
    mock_processor._get_file_type_from_mimetype.return_value = 'csv' # Default for many tests
    return mock_processor

# --- GET /data-sources ---
def test_get_data_sources_list_success(client, auth_headers, test_user, create_data_source):
    """Test fetching a list of data sources for the authenticated user."""
    ds1 = create_data_source(user=test_user, name='User DS 1')
    ds2 = create_data_source(user=test_user, name='User DS 2')
    
    # Create a data source for another user, should not appear
    other_user = User(username='other', email='other@example.com')
    other_user.set_password('pass')
    db.session.add(other_user)
    db.session.commit()
    create_data_source(user=other_user, name='Other User DS')

    response = client.get('/data-sources/', headers=auth_headers)
    assert response.status_code == 200
    data = response.json
    assert len(data) == 2
    assert {ds['name'] for ds in data} == {'User DS 1', 'User DS 2'}

def test_get_data_sources_list_unauthorized(client):
    """Test fetching data sources without authentication."""
    response = client.get('/data-sources/')
    assert response.status_code == 401

# --- POST /data-sources ---
def test_create_data_source_success(client, auth_headers, test_user):
    """Test creating a new data source (non-file based)."""
    data = {
        'name': 'New DB Source',
        'description': 'Description for DB source',
        'type': 'PostgreSQL',
        'connection_string': 'postgresql://test:test@localhost/testdb'
    }
    response = client.post('/data-sources/', headers=auth_headers, json=data)
    assert response.status_code == 201
    assert response.json['name'] == 'New DB Source'
    assert response.json['type'] == 'PostgreSQL'
    assert response.json['user_id'] == test_user.id

    # Verify in DB
    ds = DataSource.query.filter_by(name='New DB Source').first()
    assert ds is not None
    assert ds.connection_string == data['connection_string']

def test_create_data_source_duplicate_name_fails(client, auth_headers, test_user, create_data_source):
    """Test creating a data source with a duplicate name for the same user fails."""
    create_data_source(user=test_user, name='Existing Source')
    data = {
        'name': 'Existing Source',
        'type': 'PostgreSQL',
        'connection_string': 'postgresql://test:test@localhost/testdb'
    }
    response = client.post('/data-sources/', headers=auth_headers, json=data)
    assert response.status_code == 409
    assert 'already exists for this user' in response.json['message']

def test_create_data_source_invalid_type_for_this_endpoint_fails(client, auth_headers):
    """Test creating a file-based data source via the general POST endpoint fails."""
    data = {
        'name': 'File Source',
        'type': 'CSV', # Should use /upload endpoint
        'description': 'A file-based source'
    }
    response = client.post('/data-sources/', headers=auth_headers, json=data)
    assert response.status_code == 400
    assert "Use the '/upload' endpoint for file-based data sources." in response.json['message']

# --- POST /data-sources/upload ---
def test_upload_data_source_csv_success(client, auth_headers, test_user, mock_data_processor):
    """Test uploading a CSV file to create a data source."""
    csv_data = "header1,header2\nvalue1,value2".encode('utf-8')
    data = {
        'file': (BytesIO(csv_data), 'test.csv'),
        'name': 'Uploaded CSV',
        'description': 'CSV via upload'
    }
    response = client.post('/data-sources/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert response.status_code == 201
    assert response.json['name'] == 'Uploaded CSV'
    assert response.json['type'] == 'CSV'
    assert response.json['user_id'] == test_user.id
    assert response.json['file_path'] is not None # Mocked path
    assert response.json['schema_json'] == {"columns": ["col1", "col2"], "rows": 2, "dtypes": {"col1": "int64", "col2": "object"}} # Mocked schema

    mock_data_processor.load_file_data.assert_called_once()
    mock_data_processor.detect_schema.assert_called_once()

def test_upload_data_source_excel_success(client, auth_headers, test_user, mock_data_processor):
    """Test uploading an Excel file to create a data source."""
    excel_data = b"excel_file_content" # Mock binary data
    mock_data_processor._get_file_type_from_filename.return_value = 'excel'
    mock_data_processor._get_file_type_from_mimetype.return_value = 'excel'

    data = {
        'file': (BytesIO(excel_data), 'test.xlsx'),
        'name': 'Uploaded Excel',
        'description': 'Excel via upload'
    }
    response = client.post('/data-sources/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert response.status_code == 201
    assert response.json['name'] == 'Uploaded Excel'
    assert response.json['type'] == 'EXCEL'
    assert response.json['user_id'] == test_user.id
    assert response.json['file_path'] is not None

def test_upload_data_source_no_file_fails(client, auth_headers):
    """Test uploading without a file."""
    data = {
        'name': 'No File',
        'description': 'Should fail'
    }
    response = client.post('/data-sources/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'No file provided' in response.json['message']

def test_upload_data_source_unsupported_file_type_fails(client, auth_headers, mock_data_processor):
    """Test uploading an unsupported file type."""
    mock_data_processor._get_file_type_from_filename.return_value = None # Simulate unknown type
    mock_data_processor._get_file_type_from_mimetype.return_value = 'text/plain' # Simulate unsupported mimetype

    data = {
        'file': (BytesIO(b"some text"), 'test.txt'),
        'name': 'Unsupported File',
        'description': 'Text file'
    }
    response = client.post('/data-sources/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'Unsupported file type' in response.json['message']

def test_upload_data_source_empty_file_fails(client, auth_headers, mock_data_processor):
    """Test uploading an empty file."""
    mock_data_processor.load_file_data.return_value = pd.DataFrame() # Simulate empty DataFrame from processor

    data = {
        'file': (BytesIO(b""), 'empty.csv'),
        'name': 'Empty File',
        'description': 'This file is empty'
    }
    response = client.post('/data-sources/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    assert 'Uploaded file is empty or contains no data.' in response.json['message']

# --- GET /data-sources/<int:source_id> ---
def test_get_data_source_by_id_success(client, auth_headers, test_user, create_data_source):
    """Test fetching a single data source by ID."""
    ds = create_data_source(user=test_user, name='Fetchable Source')
    response = client.get(f'/data-sources/{ds.id}', headers=auth_headers)
    assert response.status_code == 200
    assert response.json['id'] == ds.id
    assert response.json['name'] == 'Fetchable Source'

def test_get_data_source_by_id_not_found(client, auth_headers):
    """Test fetching a non-existent data source."""
    response = client.get('/data-sources/999', headers=auth_headers)
    assert response.status_code == 404

def test_get_data_source_by_id_forbidden(client, auth_headers, admin_user, create_data_source):
    """Test fetching another user's data source."""
    ds_admin = create_data_source(user=admin_user, name='Admin Source') # Created by admin_user
    response = client.get(f'/data-sources/{ds_admin.id}', headers=auth_headers) # Test user tries to access
    assert response.status_code == 403

# --- PUT /data-sources/<int:source_id> ---
def test_update_data_source_success(client, auth_headers, test_user, create_data_source):
    """Test updating an existing data source."""
    ds = create_data_source(user=test_user, name='Updatable Source')
    update_data = {
        'name': 'Updated Source Name',
        'description': 'New description'
    }
    response = client.put(f'/data-sources/{ds.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 200
    assert response.json['name'] == 'Updated Source Name'
    assert response.json['description'] == 'New description'
    
    updated_ds = DataSource.query.get(ds.id)
    assert updated_ds.name == 'Updated Source Name'
    assert updated_ds.description == 'New description'

def test_update_data_source_forbidden(client, auth_headers, admin_user, create_data_source):
    """Test updating another user's data source."""
    ds_admin = create_data_source(user=admin_user, name='Admin Source')
    update_data = {'name': 'Attempted Update'}
    response = client.put(f'/data-sources/{ds_admin.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 403

def test_update_data_source_file_path_or_type_fails(client, auth_headers, test_user, create_data_source):
    """Test that file_path or type cannot be updated directly via PUT."""
    ds = create_data_source(user=test_user, name='Source', type='CSV', file_path='/original.csv')
    update_data = {
        'type': 'PostgreSQL',
        'file_path': '/new/path.csv'
    }
    response = client.put(f'/data-sources/{ds.id}', headers=auth_headers, json=update_data)
    assert response.status_code == 400
    assert "File path and type cannot be updated directly." in response.json['message']

# --- DELETE /data-sources/<int:source_id> ---
def test_delete_data_source_success(client, auth_headers, test_user, create_data_source):
    """Test deleting an existing data source."""
    ds = create_data_source(user=test_user, name='Deletable Source')
    response = client.delete(f'/data-sources/{ds.id}', headers=auth_headers)
    assert response.status_code == 204
    assert DataSource.query.get(ds.id) is None

def test_delete_data_source_forbidden(client, auth_headers, admin_user, create_data_source):
    """Test deleting another user's data source."""
    ds_admin = create_data_source(user=admin_user, name='Admin Source')
    response = client.delete(f'/data-sources/{ds_admin.id}', headers=auth_headers)
    assert response.status_code == 403

# --- GET /data-sources/<int:source_id>/schema ---
def test_get_data_source_schema_success(client, auth_headers, test_user, create_data_source):
    """Test fetching schema for a data source."""
    ds = create_data_source(user=test_user, name='Schema Source', schema_json={"columns": ["id", "name"], "rows": 5})
    response = client.get(f'/data-sources/{ds.id}/schema', headers=auth_headers)
    assert response.status_code == 200
    assert response.json == {"columns": ["id", "name"], "rows": 5}

def test_get_data_source_schema_no_schema(client, auth_headers, test_user, create_data_source):
    """Test fetching schema for a data source with no schema_json."""
    ds = create_data_source(user=test_user, name='No Schema Source', schema_json=None)
    response = client.get(f'/data-sources/{ds.id}/schema', headers=auth_headers)
    assert response.status_code == 200
    assert response.json['message'] == "No schema information available for this data source."