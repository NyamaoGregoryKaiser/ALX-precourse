```python
import asyncio
import logging
from typing import Any, Dict, List

import asyncpg
import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.models.datasource import DataSource, DataSourceType
from app.core.exceptions import BadRequestException

logger = logging.getLogger(__name__)


class DataConnector:
    """
    Service for connecting to and querying various data sources.
    Handles different database types and potentially other data sources.
    """

    async def _execute_postgresql_query(self, connection_string: str, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Executes a query against a PostgreSQL database using asyncpg.
        """
        conn = None
        try:
            conn = await asyncpg.connect(connection_string)
            if parameters:
                # asyncpg uses $1, $2 for parameters, convert from dict
                # This is a simplified conversion, real-world might need more robust mapping
                param_values = list(parameters.values())
                records = await conn.fetch(query, *param_values)
            else:
                records = await conn.fetch(query)
            return [dict(record) for record in records]
        except asyncpg.exceptions.PostgresError as e:
            logger.error(f"PostgreSQL query error: {e}")
            raise BadRequestException(detail=f"PostgreSQL query failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error with PostgreSQL connection/query: {e}")
            raise BadRequestException(detail=f"Failed to connect or query PostgreSQL: {e}")
        finally:
            if conn:
                await conn.close()

    # Placeholder for other database types
    async def _execute_mysql_query(self, connection_string: str, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError("MySQL connector not yet implemented.")

    async def _execute_csv_data(self, connection_string: str, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Simulates querying CSV data.
        In a real scenario, `connection_string` might be a path to a CSV file or S3 URI.
        `query` might be a filtering/aggregation definition.
        For simplicity, this returns mock data or reads a local file.
        """
        logger.info(f"Simulating CSV data retrieval for query: {query}")
        # In a real app, 'connection_string' would be a file path or URL
        # For demo, let's just return some hardcoded data
        if "sales" in query.lower(): # Simple query simulation
            return [
                {"month": "Jan", "sales": 100},
                {"month": "Feb", "sales": 120},
                {"month": "Mar", "sales": 90},
            ]
        return [{"data": "mock_csv_data", "source": connection_string}]


    async def test_connection(self, data_source: DataSource) -> bool:
        """
        Tests the connection to a given data source.
        """
        logger.info(f"Testing connection for data source: {data_source.name} ({data_source.type})")
        if data_source.type == DataSourceType.POSTGRES:
            try:
                # Use a lightweight query to test connectivity
                conn = await asyncpg.connect(data_source.connection_string)
                await conn.close()
                return True
            except asyncpg.exceptions.PostgresError as e:
                logger.warning(f"PostgreSQL connection test failed for {data_source.name}: {e}")
                return False
            except Exception as e:
                logger.warning(f"Unexpected error during PostgreSQL connection test: {e}")
                return False
        elif data_source.type == DataSourceType.CSV:
            # For CSV, assume connection is always "successful" if path is valid or simply mock
            return True
        else:
            logger.warning(f"Connection test not implemented for data source type: {data_source.type}")
            return False

    async def fetch_data(
        self,
        data_source: DataSource,
        query: str,
        parameters: Dict[str, Any] | None = None,
        timeout: int = 30, # seconds
    ) -> List[Dict[str, Any]]:
        """
        Fetches data from the specified data source using the given query.
        """
        logger.info(f"Fetching data from {data_source.name} (type: {data_source.type}) with query: {query}")

        try:
            if data_source.type == DataSourceType.POSTGRES:
                result = await asyncio.wait_for(
                    self._execute_postgresql_query(data_source.connection_string, query, parameters),
                    timeout=timeout
                )
            elif data_source.type == DataSourceType.CSV:
                result = await asyncio.wait_for(
                    self._execute_csv_data(data_source.connection_string, query, parameters),
                    timeout=timeout
                )
            # Add more data source types here
            else:
                raise BadRequestException(detail=f"Unsupported data source type: {data_source.type}")
            return result
        except asyncio.TimeoutError:
            logger.error(f"Data fetch timed out after {timeout} seconds for data source {data_source.name}")
            raise BadRequestException(detail=f"Query execution timed out after {timeout} seconds.")
        except BadRequestException as e:
            raise e # Re-raise custom exceptions
        except Exception as e:
            logger.error(f"Error fetching data from {data_source.name}: {e}")
            raise BadRequestException(detail=f"Error fetching data: {e}")

data_connector = DataConnector()
```