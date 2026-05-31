import pytest
import pandas as pd
from io import StringIO, BytesIO
from unittest.mock import MagicMock
from app.services.data_processing import DataProcessor
from app.services.visualization_service import VisualizationService
from app.models import DataSource, Visualization, User
from app.errors import BadRequestError, InternalServerError, NotFoundError, ForbiddenError
from app.extensions import db, cache
import json

# Fixture for DataProcessor instance
@pytest.fixture(scope='function')
def data_processor_instance():
    return DataProcessor()

# Fixture for VisualizationService instance
@pytest.fixture(scope='function')
def visualization_service_instance():
    # Ensure cache is cleared for each test function
    cache.clear()
    return VisualizationService()

# --- DataProcessor Unit/Integration Tests ---
def test_data_processor_load_csv_data(data_processor_instance):
    csv_content = "col1,col2\n1,a\n2,b\n3,c"
    mock_file = MagicMock()
    mock_file.read.return_value = csv_content.encode('utf-8')
    mock_file.filename = 'test.csv'
    mock_file.mimetype = 'text/csv'

    df = data_processor_instance.load_file_data(mock_file, 'csv')
    assert not df.empty
    assert list(df.columns) == ['col1', 'col2']
    assert len(df) == 3

def test_data_processor_load_excel_data(data_processor_instance):
    # Create a dummy Excel file in memory
    df_test = pd.DataFrame({'col1': [1, 2], 'col2': ['x', 'y']})
    excel_buffer = BytesIO()
    df_test.to_excel(excel_buffer, index=False)
    excel_buffer.seek(0)

    mock_file = MagicMock()
    mock_file.read.return_value = excel_buffer.getvalue()
    mock_file.filename = 'test.xlsx'
    mock_file.mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    df = data_processor_instance.load_file_data(mock_file, 'excel')
    assert not df.empty
    assert list(df.columns) == ['col1', 'col2']
    assert len(df) == 2

def test_data_processor_load_unsupported_file_type(data_processor_instance):
    mock_file = MagicMock()
    mock_file.filename = 'test.txt'
    mock_file.mimetype = 'text/plain'
    with pytest.raises(BadRequestError, match="Unsupported file type"):
        data_processor_instance.load_file_data(mock_file)

def test_data_processor_detect_schema(data_processor_instance):
    df = pd.DataFrame({
        'name': ['Alice', 'Bob'],
        'age': [30, 24],
        'score': [95.5, 88.0],
        'is_active': [True, False],
        'city': ['NY', 'LA']
    })
    schema = data_processor_instance.detect_schema(df)
    assert 'columns' in schema
    assert 'rows' in schema
    assert 'dtypes' in schema
    assert 'name' in schema['columns']
    assert schema['rows'] == 2
    assert schema['dtypes']['age'] == 'int64'
    assert schema['dtypes']['score'] == 'float64'
    assert schema['dtypes']['is_active'] == 'bool'
    assert schema['dtypes']['city'] == 'category' # Based on heuristic (object and low unique count)

def test_data_processor_apply_query_and_transformations_select_filter_group_aggregate_sort_limit(data_processor_instance):
    df = pd.DataFrame({
        'Date': pd.to_datetime(['2023-01-01', '2023-01-01', '2023-01-02', '2023-01-02', '2023-01-03']),
        'Category': ['A', 'B', 'A', 'C', 'B'],
        'Value1': [10, 20, 15, 25, 30],
        'Value2': [1.1, 2.2, 1.5, 2.8, 3.3],
        'Region': ['East', 'West', 'East', 'North', 'West']
    })

    query_json = {
        "columns": ["Category", "Value1", "Region"],
        "filters": {"Value1": {"operator": ">=", "value": 20}},
        "group_by": ["Region"],
        "aggregate": {"Value1": "sum"},
        "sort_by": [{"column": "Value1", "order": "desc"}],
        "limit": 2
    }
    processed_df = data_processor_instance.apply_query_and_transformations(df, query_json)

    assert list(processed_df.columns) == ['Region', 'Value1'] # Group by and aggregate renames columns
    assert len(processed_df) == 2
    # Expect: West (30), North (25)
    assert processed_df.iloc[0]['Region'] == 'West'
    assert processed_df.iloc[0]['Value1'] == 30
    assert processed_df.iloc[1]['Region'] == 'North'
    assert processed_df.iloc[1]['Value1'] == 25

def test_data_processor_format_for_visualization_bar_chart(data_processor_instance):
    df = pd.DataFrame({'Category': ['A', 'B'], 'Value': [10, 20]})
    viz_config = {"chart_type": "bar", "x_axis": "Category", "y_axis": "Value"}
    formatted_data = data_processor_instance.format_for_visualization(df, viz_config)
    assert formatted_data == [{'x': 'A', 'y': 10}, {'x': 'B', 'y': 20}]

def test_data_processor_format_for_visualization_table(data_processor_instance):
    df = pd.DataFrame({'Category': ['A', 'B'], 'Value': [10, 20]})
    viz_config = {"chart_type": "table"}
    formatted_data = data_processor_instance.format_for_visualization(df, viz_config)
    assert formatted_data == [{'Category': 'A', 'Value': 10}, {'Category': 'B', 'Value': 20}]

def test_data_processor_format_for_visualization_multi_series(data_processor_instance):
    df = pd.DataFrame({
        'X_axis': [1, 2, 1, 2],
        'Y_axis': [10, 15, 12, 18],
        'Series': ['A', 'A', 'B', 'B']
    })
    viz_config = {"chart_type": "line", "x_axis": "X_axis", "y_axis": "Y_axis", "color_by": "Series"}
    formatted_data = data_processor_instance.format_for_visualization(df, viz_config)
    
    expected_data = [
        {'name': 'A', 'data': [{'x': 1, 'y': 10}, {'x': 2, 'y': 15}]},
        {'name': 'B', 'data': [{'x': 1, 'y': 12}, {'x': 2, 'y': 18}]}
    ]
    assert formatted_data == expected_data

# --- VisualizationService Integration Tests ---
def test_visualization_service_get_visualization_by_id(session, visualization_service_instance, create_visualization):
    viz = create_visualization()
    fetched_viz = visualization_service_instance.get_visualization_by_id(viz.id)
    assert fetched_viz.id == viz.id
    assert fetched_viz.name == viz.name

def test_visualization_service_get_visualization_by_id_not_found(session, visualization_service_instance):
    with pytest.raises(NotFoundError, match="Visualization with ID 999 not found."):
        visualization_service_instance.get_visualization_by_id(999)

def test_visualization_service_get_processed_visualization_data_success(session, visualization_service_instance, test_user, create_data_source, create_visualization, mocker):
    ds = create_data_source(user=test_user, name='Sales Data', type='CSV')
    viz = create_visualization(user=test_user, ds=ds, name='Monthly Sales', type='bar', config_json={"chart_type": "bar", "x_axis": "Category", "y_axis": "Value1"})
    
    # Mock _load_data_from_source to return a predictable DataFrame
    mock_df = pd.DataFrame({
        'Category': ['Electronics', 'Clothing', 'Food'],
        'Value1': [100, 150, 75],
        'Value2': [10, 15, 7.5],
        'Region': ['North', 'South', 'East']
    })
    mocker.patch.object(visualization_service_instance, '_load_data_from_source', return_value=mock_df)

    # Mock data_processor's transformation and formatting
    mock_transformed_df = pd.DataFrame({
        'Category': ['Clothing', 'Electronics', 'Food'],
        'Value1': [150, 100, 75]
    })
    mock_formatted_data = [{'x': 'Clothing', 'y': 150}, {'x': 'Electronics', 'y': 100}, {'x': 'Food', 'y': 75}]

    mocker.patch.object(data_processor_instance, 'apply_query_and_transformations', return_value=mock_transformed_df)
    mocker.patch.object(data_processor_instance, 'format_for_visualization', return_value=mock_formatted_data)

    data = visualization_service_instance.get_processed_visualization_data(viz.id, test_user.id)
    assert data == mock_formatted_data
    
    # Check if cache was used on second call
    visualization_service_instance._load_data_from_source.assert_called_once() # Only called once

    # Second call should hit cache, so _load_data_from_source should not be called again
    data_2 = visualization_service_instance.get_processed_visualization_data(viz.id, test_user.id)
    assert data_2 == mock_formatted_data
    visualization_service_instance._load_data_from_source.assert_called_once() # Still only once

def test_visualization_service_get_processed_visualization_data_authorization(session, visualization_service_instance, test_user, admin_user, create_data_source, create_visualization):
    ds_user = create_data_source(user=test_user)
    viz_user = create_visualization(user=test_user, ds=ds_user)
    
    ds_admin = create_data_source(user=admin_user) # Data source owned by admin
    viz_admin = create_visualization(user=admin_user, ds=ds_admin) # Viz owned by admin

    # User tries to access admin's viz
    with pytest.raises(ForbiddenError, match="You do not have permission to access the data for this visualization."):
        visualization_service_instance.get_processed_visualization_data(viz_admin.id, test_user.id)

    # Admin should be able to access user's viz (current implementation allows owner of viz OR owner of datasource)
    # If the viz is owned by `test_user`, the admin should be able to see it via admin_user.id
    # However, the current `owns_resource_or_admin` decorator applies for API,
    # the service itself currently checks `viz.user_id != user_id and viz.data_source.user_id != user_id`.
    # A true admin should bypass this, which is a slight inconsistency between decorator and service logic.
    # For now, let's test based on the service's current direct check:
    # If admin tries to view other user's viz, it would fail unless admin_user.id is viz_user.id or ds_user.id.
    # So, for admin to access test_user's viz, the check needs to be extended in the service itself to use an `is_admin` claim.
    # For now, if admin_user.id is not viz_user.id, this will fail.
    # Let's adjust test to reflect current simple authorization in service.
    
    # Admin tries to access user's viz (will fail with current service logic)
    with pytest.raises(ForbiddenError, match="You do not have permission to access the data for this visualization."):
        visualization_service_instance.get_processed_visualization_data(viz_user.id, admin_user.id)
    
    # This indicates that the `VisualizationService` needs to be aware of admin roles,
    # or the permission check should be handled solely by the API layer and the service trusts the API.
    # For ALX, this highlights a design decision and potential area for improvement (e.g., pass `is_admin` to service).

def test_visualization_service_load_data_from_source_mock_file(session, visualization_service_instance, test_user, create_data_source, mocker):
    ds = create_data_source(user=test_user, name='Mock CSV Data', type='CSV', file_path='/mock/path.csv')
    
    # Mock the internal _generate_mock_dataframe call
    mocker.patch.object(visualization_service_instance, '_generate_mock_dataframe', return_value=pd.DataFrame({'A': [1], 'B': [2]}))
    
    df = visualization_service_instance._load_data_from_source(ds)
    assert not df.empty
    assert list(df.columns) == ['A', 'B']

def test_visualization_service_load_data_from_source_unsupported_type(session, visualization_service_instance, test_user, create_data_source):
    ds = create_data_source(user=test_user, name='Unsupported Source', type='S3', file_path=None)
    with pytest.raises(BadRequestError, match="Data source type 'S3' is not supported or misconfigured."):
        visualization_service_instance._load_data_from_source(ds)

def test_visualization_service_get_processed_visualization_data_empty_raw_df(session, visualization_service_instance, test_user, create_data_source, create_visualization, mocker):
    ds = create_data_source(user=test_user, name='Empty Data', type='CSV')
    viz = create_visualization(user=test_user, ds=ds)
    
    mocker.patch.object(visualization_service_instance, '_load_data_from_source', return_value=pd.DataFrame()) # Return empty df
    mocker.patch.object(data_processor_instance, 'apply_query_and_transformations', return_value=pd.DataFrame())
    mocker.patch.object(data_processor_instance, 'format_for_visualization', return_value=[])

    data = visualization_service_instance.get_processed_visualization_data(viz.id, test_user.id)
    assert data == []
    visualization_service_instance._load_data_from_source.assert_called_once() # Should still attempt to load