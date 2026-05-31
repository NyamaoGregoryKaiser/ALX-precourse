import os
from faker import Faker
from datetime import datetime, timedelta
import random
from app.models import User, DataSource, Visualization, Dashboard, DashboardVisualization
from app.extensions import db
import json # For JSON fields

# Initialize Faker for generating fake data
fake = Faker()

def seed_data(db_instance):
    """
    Populates the database with initial fake data for testing and demonstration.
    """
    print("Seeding database...")

    # Clear existing data (optional, for development/testing only)
    # db_instance.drop_all() # CAUTION: This drops all tables!
    # db_instance.create_all() # Recreate empty tables

    # Ensure tables exist without dropping them
    # For a clean slate, it's better to run `flask db downgrade base` then `flask db upgrade head`
    # Or just ensure migrations have been run.
    
    # Check if data already exists to prevent duplicates
    if User.query.first():
        print("Database already contains data. Skipping seeding.")
        return

    # 1. Create Users
    users = []
    for i in range(5):
        user = User(
            username=f'user{i+1}',
            email=f'user{i+1}@example.com',
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
        )
        user.set_password('password123')
        users.append(user)
        db_instance.session.add(user)
    db_instance.session.commit()
    print(f"Created {len(users)} users.")

    # 2. Create Data Sources
    data_sources = []
    source_types = ['CSV', 'PostgreSQL', 'API']
    for user in users:
        for i in range(2):
            source_type = random.choice(source_types)
            ds = DataSource(
                name=f'{user.username}_data_source_{i+1}',
                description=fake.sentence(),
                type=source_type,
                connection_string=f'mock_{source_type.lower()}://{fake.url()}' if source_type != 'CSV' else None,
                file_path=f'/data/{user.username}_file_{i+1}.csv' if source_type == 'CSV' else None,
                schema_json={
                    "columns": ["Date", "Category", "Value1", "Value2", "Region"],
                    "rows": 100,
                    "dtypes": {
                        "Date": "datetime64[ns]",
                        "Category": "object",
                        "Value1": "int64",
                        "Value2": "float64",
                        "Region": "object"
                    }
                },
                user_id=user.id,
                created_at=fake.date_time_between(start_date='-1y', end_date='now')
            )
            data_sources.append(ds)
            db_instance.session.add(ds)
    db_instance.session.commit()
    print(f"Created {len(data_sources)} data sources.")

    # 3. Create Visualizations
    visualizations = []
    chart_types = ['bar', 'line', 'pie', 'table', 'scatter']
    for ds in data_sources:
        for i in range(1): # Create 1 visualization per data source for now
            chart_type = random.choice(chart_types)
            viz_config = {
                "chart_type": chart_type,
                "title": f"Sales by Category for {ds.name}",
            }
            if chart_type in ['bar', 'line', 'scatter']:
                viz_config.update({"x_axis": "Category", "y_axis": "Value1", "color_by": "Region"})
            elif chart_type == 'pie':
                viz_config.update({"label_field": "Category", "value_field": "Value1"})

            viz_query = {
                "columns": ["Category", "Value1", "Value2", "Region", "Date"],
                "filters": {},
                "group_by": ["Category"],
                "aggregate": {"Value1": "sum", "Value2": "mean"},
                "sort_by": [{"column": "Value1", "order": "desc"}],
                "limit": 10
            } if chart_type != 'raw_data' else {}

            viz = Visualization(
                name=f'{ds.name}_viz_{chart_type}_{i+1}',
                description=fake.sentence(),
                type=chart_type,
                config_json=viz_config,
                query_json=viz_query,
                data_source_id=ds.id,
                user_id=ds.user_id,
                created_at=fake.date_time_between(start_date=ds.created_at, end_date='now')
            )
            visualizations.append(viz)
            db_instance.session.add(viz)
    db_instance.session.commit()
    print(f"Created {len(visualizations)} visualizations.")

    # 4. Create Dashboards
    dashboards = []
    for user in users:
        for i in range(1): # Create 1 dashboard per user
            dash = Dashboard(
                name=f'{user.username}_dashboard_{i+1}',
                description=fake.sentence(),
                layout_json={"rows": 12, "cols": 12}, # Example grid layout
                user_id=user.id,
                created_at=fake.date_time_between(start_date='-6m', end_date='now')
            )
            dashboards.append(dash)
            db_instance.session.add(dash)
    db_instance.session.commit()
    print(f"Created {len(dashboards)} dashboards.")

    # 5. Link Visualizations to Dashboards
    dashboard_visualizations = []
    for dashboard in dashboards:
        # Get visualizations owned by this dashboard's user
        user_visualizations = [v for v in visualizations if v.user_id == dashboard.user_id]
        random.shuffle(user_visualizations)
        
        # Add a few visualizations to each dashboard
        for i, viz in enumerate(user_visualizations[:min(len(user_visualizations), 3)]):
            dash_viz = DashboardVisualization(
                dashboard_id=dashboard.id,
                visualization_id=viz.id,
                position_x=random.randint(0, 6),
                position_y=random.randint(0, 6),
                width=random.choice([4, 6, 8]),
                height=random.choice([3, 4, 5]),
                created_at=fake.date_time_between(start_date=dashboard.created_at, end_date='now')
            )
            dashboard_visualizations.append(dash_viz)
            db_instance.session.add(dash_viz)
    db_instance.session.commit()
    print(f"Linked {len(dashboard_visualizations)} visualizations to dashboards.")

    print("Database seeding complete.")

if __name__ == '__main__':
    # This block allows running `python seed.py` directly for testing the seeding logic
    # but it's generally better to use `flask seed`
    from app import create_app
    app = create_app('development')
    with app.app_context():
        seed_data(db)