```python
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.crud.user import user as crud_user
from app.models.user import User
from app.models.datasource import DataSource, DataSourceType
from app.models.dataset import Dataset, DatasetType
from app.models.visualization import Visualization, ChartType
from app.models.dashboard import Dashboard
from app.schemas.user import UserCreate
from app.schemas.datasource import DataSourceCreate
from app.schemas.dataset import DatasetCreate
from app.schemas.visualization import VisualizationCreate
from app.schemas.dashboard import DashboardCreate

logger = logging.getLogger(__name__)


async def init_db(db: AsyncSession) -> None:
    """
    Initializes the database with a superuser and some sample data if they don't exist.
    This function should be called after Alembic migrations have run.
    """
    # 1. Create Superuser
    user = await crud_user.get_by_email(db, email=settings.FIRST_SUPERUSER_EMAIL)
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER_EMAIL,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            first_name="Admin",
            last_name="User",
        )
        user = await crud_user.create(db, obj_in=user_in)
        user.is_superuser = True
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"Created initial superuser: {user.email}")
    else:
        logger.info(f"Superuser '{user.email}' already exists.")

    # 2. Create Sample Data (if superuser exists)
    if user:
        await create_sample_data(db, user_id=user.id)
    else:
        logger.warning("No superuser found to associate sample data with.")


async def create_sample_data(db: AsyncSession, user_id: UUID) -> None:
    """
    Creates sample data for datasources, datasets, visualizations, and dashboards.
    """
    # Check if sample data already exists to prevent duplicates
    if await db.scalar(select(DataSource).filter_by(name="Sample PostgreSQL DB")):
        logger.info("Sample data already exists. Skipping creation.")
        return

    logger.info("Creating sample data...")

    # Sample Data Source
    pg_ds_in = DataSourceCreate(
        name="Sample PostgreSQL DB",
        description="A sample PostgreSQL database for demonstration.",
        type=DataSourceType.POSTGRES,
        connection_string="postgresql://user:password@host:5432/database" # Placeholder, update in .env or docker-compose
    )
    sample_pg_ds = await crud_datasource.create(db, obj_in=pg_ds_in, owner_id=user_id)
    logger.info(f"Created sample data source: {sample_pg_ds.name}")

    csv_ds_in = DataSourceCreate(
        name="Sample CSV Data",
        description="A sample CSV data source (mocked data).",
        type=DataSourceType.CSV,
        connection_string="/app/data/sample_sales.csv" # Placeholder, this is mocked in data_connector
    )
    sample_csv_ds = await crud_datasource.create(db, obj_in=csv_ds_in, owner_id=user_id)
    logger.info(f"Created sample CSV data source: {sample_csv_ds.name}")

    # Sample Dataset (from PostgreSQL)
    sales_ds_in = DatasetCreate(
        name="Monthly Sales Data",
        description="Aggregated monthly sales from the sample PostgreSQL DB.",
        type=DatasetType.SQL_QUERY,
        query_string="SELECT DATE_TRUNC('month', order_date) as month, SUM(amount) as total_sales FROM orders GROUP BY 1 ORDER BY 1",
        parameters={"start_date": "2023-01-01", "end_date": "2023-12-31"},
        data_source_id=sample_pg_ds.id
    )
    monthly_sales_dataset = await crud_dataset.create(db, obj_in=sales_ds_in, owner_id=user_id)
    logger.info(f"Created sample dataset: {monthly_sales_dataset.name}")

    # Sample Dataset (from CSV)
    product_performance_ds_in = DatasetCreate(
        name="Product Performance (CSV)",
        description="Mocked product performance data from CSV.",
        type=DatasetType.CSV_FILE,
        query_string="select * from sales_data where product_category = 'Electronics'", # Simplified query for CSV
        parameters={},
        data_source_id=sample_csv_ds.id
    )
    product_performance_dataset = await crud_dataset.create(db, obj_in=product_performance_ds_in, owner_id=user_id)
    logger.info(f"Created sample dataset: {product_performance_dataset.name}")


    # Sample Visualizations
    sales_bar_viz_in = VisualizationCreate(
        name="Monthly Sales Bar Chart",
        description="Bar chart showing total sales by month.",
        chart_type=ChartType.BAR_CHART,
        config={
            "columns": [{"field": "month", "label": "Month"}, {"field": "total_sales", "label": "Total Sales"}],
            "x_axis": {"field": "month", "title": "Month"},
            "y_axis": {"field": "total_sales", "title": "Total Sales"},
            "color": {"field": "month"},
            "tooltip": True
        },
        dataset_id=monthly_sales_dataset.id
    )
    sales_bar_viz = await crud_visualization.create(db, obj_in=sales_bar_viz_in, owner_id=user_id)
    logger.info(f"Created sample visualization: {sales_bar_viz.name}")

    product_pie_viz_in = VisualizationCreate(
        name="Product Category Distribution (CSV)",
        description="Pie chart showing distribution of products.",
        chart_type=ChartType.PIE_CHART,
        config={
            "columns": [{"field": "product_category", "label": "Category"}, {"field": "revenue", "label": "Revenue"}],
            "angle": {"field": "revenue"},
            "color": {"field": "product_category"},
            "tooltip": True,
            "aggregation": {"group_by": ["product_category"], "metrics": {"revenue": {"field": "sales", "op": "sum"}}}
        },
        dataset_id=product_performance_dataset.id
    )
    product_pie_viz = await crud_visualization.create(db, obj_in=product_pie_viz_in, owner_id=user_id)
    logger.info(f"Created sample visualization: {product_pie_viz.name}")


    # Sample Dashboard
    main_dashboard_in = DashboardCreate(
        name="Sales Overview Dashboard",
        description="A dashboard showing key sales metrics.",
        layout={
            "widgets": [
                {"id": "widget-1", "x": 0, "y": 0, "w": 6, "h": 8, "visualization_id": str(sales_bar_viz.id)},
                {"id": "widget-2", "x": 6, "y": 0, "w": 6, "h": 8, "visualization_id": str(product_pie_viz.id)},
            ]
        }
    )
    main_dashboard = await crud_dashboard.create(db, obj_in=main_dashboard_in, owner_id=user_id)
    logger.info(f"Created sample dashboard: {main_dashboard.name}")

    logger.info("Sample data creation complete.")

```