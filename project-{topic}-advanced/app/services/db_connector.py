import logging
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app.models import DatabaseType

logger = logging.getLogger(__name__)

class DBConnector:
    """
    Manages connections to external monitored databases.
    Provides a factory for SQLAlchemy engines based on database type.
    """

    @staticmethod
    def _get_connection_string(db_type: DatabaseType, host: str, port: int,
                               username: str, password: str, database: str) -> str:
        """Constructs a SQLAlchemy connection string."""
        if db_type == DatabaseType.POSTGRESQL:
            return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}"
        elif db_type == DatabaseType.MYSQL:
            return f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}"
        else:
            raise ValueError(f"Unsupported database type: {db_type.value}")

    def get_engine(self, db_config: Dict[str, Any]) -> Any:
        """
        Creates and returns a SQLAlchemy engine for the specified database configuration.

        Args:
            db_config: A dictionary containing database connection parameters
                       (db_type, host, port, username, password, database).

        Returns:
            An SQLAlchemy engine object.

        Raises:
            ValueError: If an unsupported database type is provided.
            SQLAlchemyError: If there's an issue creating the engine or connecting.
        """
        try:
            conn_string = self._get_connection_string(
                db_type=db_config['db_type'],
                host=db_config['host'],
                port=db_config['port'],
                username=db_config['username'],
                password=db_config['password'],
                database=db_config['database']
            )
            # Consider connection pooling appropriate for your use case.
            # For a monitoring tool, a fresh connection/engine per task might be acceptable
            # or a small pool if many parallel tasks hit the same DB.
            engine = create_engine(conn_string, pool_pre_ping=True, pool_size=5, max_overflow=10)
            return engine
        except ValueError as e:
            logger.error(f"Invalid DB configuration for {db_config.get('name')}: {e}")
            raise
        except SQLAlchemyError as e:
            logger.error(f"SQLAlchemy error creating engine for {db_config.get('name')}: {e}")
            raise

    def test_connection(self, db_config: Dict[str, Any]) -> bool:
        """
        Tests the connectivity to the external database.

        Args:
            db_config: Database connection parameters.

        Returns:
            True if connection is successful, False otherwise.
        """
        engine = None
        try:
            engine = self.get_engine(db_config)
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info(f"Successfully connected to database {db_config['name']} at {db_config['host']}:{db_config['port']}/{db_config['database']}")
            return True
        except OperationalError as e:
            logger.warning(f"Failed to connect to database {db_config['name']} ({db_config['host']}:{db_config['port']}): {e}")
            return False
        except Exception as e:
            logger.error(f"An unexpected error occurred while testing connection to {db_config['name']}: {e}", exc_info=True)
            return False
        finally:
            if engine:
                engine.dispose() # Ensure all connections in the pool are closed
```