import logging
import pandas as pd
from app.models import DataSource, Visualization, User
from app.extensions import db, cache
from app.errors import NotFoundError, BadRequestError, InternalServerError, ForbiddenError
from app.services.data_processing import data_processor
import json
import os # For mock file paths

log = logging.getLogger(__name__)

class VisualizationService:
    """
    Handles business logic related to visualizations, including data fetching and processing.
    """

    def get_visualization_by_id(self, visualization_id: int):
        """Fetches a visualization by ID."""
        visualization = Visualization.query.get(visualization_id)
        if not visualization:
            raise NotFoundError(f"Visualization with ID {visualization_id} not found.")
        return visualization

    @cache.memoize(timeout=300) # Cache processed data for 5 minutes
    def get_processed_visualization_data(self, visualization_id: int, user_id: int):
        """
        Fetches a visualization's data, applies its query_json,
        and formats it for client-side rendering.
        Data is cached based on visualization_id and user_id.
        """
        log.info(f"Fetching processed data for visualization {visualization_id} for user {user_id}")
        visualization = self.get_visualization_by_id(visualization_id)

        # Basic authorization check: ensure user owns the visualization or its data source
        if visualization.user_id != user_id and visualization.data_source.user_id != user_id:
            # For enterprise-grade, a more granular sharing/permissions model would be needed.
            # For now, restrict to owner of viz or owner of datasource.
            raise ForbiddenError("You do not have permission to access the data for this visualization.")

        data_source = visualization.data_source
        if not data_source:
            raise InternalServerError(f"Data source for visualization {visualization_id} not found.")

        # 1. Load raw data from data source
        raw_df = self._load_data_from_source(data_source)
        if raw_df is None or raw_df.empty:
            log.warning(f"No raw data loaded for data source ID {data_source.id}.")
            return []

        # 2. Apply query/transformations
        query_json = visualization.query_json if visualization.query_json else {}
        processed_df = data_processor.apply_query_and_transformations(raw_df, query_json)

        # 3. Format for client visualization
        formatted_data = data_processor.format_for_visualization(processed_df, visualization.config_json)

        log.info(f"Successfully processed data for visualization {visualization_id}.")
        return formatted_data

    def _load_data_from_source(self, data_source: DataSource) -> pd.DataFrame:
        """
        Internal method to load data from a DataSource model.
        This would connect to actual databases or read files in a real system.
        For this implementation, we'll simulate it.
        """
        df = pd.DataFrame()
        if data_source.type in ['CSV', 'Excel'] and data_source.file_path:
            # In a real app, 'file_path' would point to a secure storage (e.g., S3, internal storage)
            # For this example, let's assume `file_path` contains simple mock data or is a placeholder.
            # A full implementation would read from the actual stored file.
            try:
                # Mocking file loading for demonstration.
                # Replace with actual file reading logic:
                # if data_source.type == 'CSV':
                #     df = pd.read_csv(data_source.file_path)
                # elif data_source.type == 'Excel':
                #     df = pd.read_excel(data_source.file_path)

                # For now, generate a simple mock DataFrame based on the source's name
                df = self._generate_mock_dataframe(data_source.name)

            except Exception as e:
                log.error(f"Failed to load file '{data_source.file_path}' for data source {data_source.id}: {e}", exc_info=True)
                raise InternalServerError(f"Error loading file data for source {data_source.name}.")
        elif data_source.type in ['PostgreSQL', 'MySQL'] and data_source.connection_string:
            # In a real app, establish DB connection and query.
            # Example:
            # from sqlalchemy import create_engine
            # try:
            #     engine = create_engine(data_source.connection_string)
            #     # This requires the user to specify a query, or we read a table
            #     # For simplicity, we'll assume a default table or a query from viz.query_json
            #     df = pd.read_sql("SELECT * FROM some_default_table LIMIT 100", engine)
            # except Exception as e:
            #     log.error(f"Failed to connect or query DB for source {data_source.id}: {e}", exc_info=True)
            #     raise InternalServerError(f"Error connecting to database for source {data_source.name}.")

            # Mocking DB loading
            df = self._generate_mock_dataframe(data_source.name)
        elif data_source.type == 'API' and data_source.connection_string:
            # In a real app, make an HTTP request.
            # Example:
            # import requests
            # try:
            #     response = requests.get(data_source.connection_string)
            #     response.raise_for_status()
            #     data = response.json()
            #     df = pd.DataFrame(data)
            # except Exception as e:
            #     log.error(f"Failed to fetch from API for source {data_source.id}: {e}", exc_info=True)
            #     raise InternalServerError(f"Error fetching from API for source {data_source.name}.")

            # Mocking API loading
            df = self._generate_mock_dataframe(data_source.name)
        else:
            log.warning(f"Unsupported data source type '{data_source.type}' or missing connection details for source {data_source.id}.")
            raise BadRequestError(f"Data source type '{data_source.type}' is not supported or misconfigured.")

        return df

    def _generate_mock_dataframe(self, seed_name: str) -> pd.DataFrame:
        """Generates a simple mock DataFrame based on a seed string."""
        data = {
            'Category': [f'{seed_name} A', f'{seed_name} B', f'{seed_name} C', f'{seed_name} D', f'{seed_name} E'],
            'Value1': [10 * (i + 1) for i in range(5)],
            'Value2': [15 * (i + 1) for i in range(5)],
            'Date': pd.to_datetime(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05']),
            'Region': ['North', 'South', 'East', 'West', 'North']
        }
        return pd.DataFrame(data)

# Export a singleton instance
visualization_service = VisualizationService()