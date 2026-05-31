import pytest
from app.models import User, DataSource, Visualization, Dashboard, DashboardVisualization
from app.extensions import db
from datetime import datetime, timedelta

def test_user_password_hashing(session):
    """Test password hashing and verification for User model."""
    user = User(username='test', email='test@example.com')
    user.set_password('mysecretpassword')
    assert user.password_hash is not None
    assert user.check_password('mysecretpassword')
    assert not user.check_password('wrongpassword')
    # Password hash should change on subsequent calls (due to salt)
    old_hash = user.password_hash
    user.set_password('newpassword')
    assert user.password_hash != old_hash
    assert user.check_password('newpassword')

def test_user_creation_timestamps(session):
    """Test user creation and update timestamps."""
    user = User(username='timeuser', email='time@example.com')
    user.set_password('password')
    session.add(user)
    session.commit()

    assert user.created_at is not None
    assert user.updated_at is not None
    assert user.created_at == user.updated_at # Initially

    # Simulate an update
    user.username = 'updated_timeuser'
    session.commit()
    assert user.updated_at > user.created_at

def test_data_source_creation(session, test_user):
    """Test DataSource model creation."""
    ds = DataSource(
        name='My CSV Data',
        description='CSV of sales data',
        type='CSV',
        file_path='/path/to/sales.csv',
        schema_json={"columns": ["date", "sales"]},
        user_id=test_user.id
    )
    session.add(ds)
    session.commit()
    assert ds.id is not None
    assert ds.user_id == test_user.id
    assert ds.owner == test_user

def test_visualization_creation(session, test_user, create_data_source):
    """Test Visualization model creation and relationship."""
    ds = create_data_source(user=test_user)
    viz_config = {"chart_type": "bar", "x_axis": "category", "y_axis": "value"}
    viz_query = {"limit": 10}

    viz = Visualization(
        name='Sales Bar Chart',
        description='Monthly sales by category',
        type='bar',
        config_json=viz_config,
        query_json=viz_query,
        data_source_id=ds.id,
        user_id=test_user.id
    )
    session.add(viz)
    session.commit()
    assert viz.id is not None
    assert viz.data_source_id == ds.id
    assert viz.data_source == ds
    assert viz.user_id == test_user.id
    assert viz.creator == test_user
    assert viz.config_json == viz_config
    assert viz.query_json == viz_query

def test_dashboard_creation(session, test_user):
    """Test Dashboard model creation."""
    dash = Dashboard(
        name='Executive Dashboard',
        description='Key performance indicators',
        layout_json={"grid": {"rows": 12, "cols": 12}},
        user_id=test_user.id
    )
    session.add(dash)
    session.commit()
    assert dash.id is not None
    assert dash.user_id == test_user.id
    assert dash.creator == test_user
    assert dash.layout_json == {"grid": {"rows": 12, "cols": 12}}

def test_dashboard_visualization_association(session, test_user, create_data_source, create_visualization, create_dashboard):
    """Test DashboardVisualization association model."""
    ds = create_data_source(user=test_user)
    viz1 = create_visualization(user=test_user, ds=ds, name='Viz 1')
    viz2 = create_visualization(user=test_user, ds=ds, name='Viz 2')
    dash = create_dashboard(user=test_user)

    dash_viz1 = DashboardVisualization(
        dashboard_id=dash.id,
        visualization_id=viz1.id,
        position_x=0, position_y=0, width=6, height=4
    )
    dash_viz2 = DashboardVisualization(
        dashboard_id=dash.id,
        visualization_id=viz2.id,
        position_x=6, position_y=0, width=6, height=4
    )
    session.add_all([dash_viz1, dash_viz2])
    session.commit()

    assert len(dash.visualization_associations) == 2
    assert dash_viz1.dashboard == dash
    assert dash_viz1.visualization == viz1
    assert dash_viz2.dashboard == dash
    assert dash_viz2.visualization == viz2

    # Test cascade delete for visualization
    session.delete(viz1)
    session.commit()
    assert DashboardVisualization.query.get((dash.id, viz1.id)) is None # Association should be deleted
    session.refresh(dash)
    assert len(dash.visualization_associations) == 1

    # Test cascade delete for dashboard
    session.delete(dash)
    session.commit()
    assert DashboardVisualization.query.get((dash.id, viz2.id)) is None # Remaining association should be deleted

def test_cascade_delete_user_data(session, test_user, create_data_source, create_visualization, create_dashboard):
    """Test that deleting a user cascades to their data sources, visualizations, and dashboards."""
    ds = create_data_source(user=test_user)
    viz = create_visualization(user=test_user, ds=ds)
    dash = create_dashboard(user=test_user)

    # Ensure all objects are in the database
    assert User.query.get(test_user.id) is not None
    assert DataSource.query.get(ds.id) is not None
    assert Visualization.query.get(viz.id) is not None
    assert Dashboard.query.get(dash.id) is not None

    session.delete(test_user)
    session.commit()

    assert User.query.get(test_user.id) is None
    assert DataSource.query.get(ds.id) is None
    assert Visualization.query.get(viz.id) is None
    assert Dashboard.query.get(dash.id) is None

def test_json_field_defaults(session, test_user):
    """Test default values for JSON fields."""
    ds = DataSource(
        name='Source with default schema',
        description='Test default schema',
        type='CSV',
        user_id=test_user.id
    )
    viz = Visualization(
        name='Viz with default config',
        description='Test default config',
        type='bar',
        data_source_id=ds.id,
        user_id=test_user.id
    )
    dash = Dashboard(
        name='Dash with default layout',
        description='Test default layout',
        user_id=test_user.id
    )
    session.add_all([ds, viz, dash])
    session.commit()

    assert ds.schema_json is None # Schema has no default, it's nullable
    assert viz.config_json == {}
    assert dash.layout_json == {}