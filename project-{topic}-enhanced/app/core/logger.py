```python
import logging
import sys
from logging.handlers import RotatingFileHandler
from app.core.config import settings

def setup_logging():
    """
    Configures the application's logging system.
    Logs to console and a rotating file.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Basic configuration for the root logger
    # This captures messages from all modules
    logging.basicConfig(level=log_level)

    # Create a console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(
        "%(levelname)s:     %(asctime)s - %(name)s - %(message)s"
    )
    console_handler.setFormatter(console_formatter)

    # Create a rotating file handler
    # Max size 10 MB, keep 5 backup files
    file_handler = RotatingFileHandler(
        settings.LOG_FILE_PATH, maxBytes=10 * 1024 * 1024, backupCount=5
    )
    file_handler.setLevel(log_level)
    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s (Line: %(lineno)d in %(funcName)s)"
    )
    file_handler.setFormatter(file_formatter)

    # Get the root logger and remove any default handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add our custom handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Suppress verbose logging from libraries like uvicorn, sqlalchemy etc.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING) # Reduce SQLAlchemy verbose logs
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING) # For test client

    # Set application specific logger
    app_logger = logging.getLogger("app")
    app_logger.setLevel(log_level)

# Example usage (can be called at app startup)
# if __name__ == "__main__":
#     setup_logging()
#     logger = logging.getLogger("app.test")
#     logger.debug("This is a debug message.")
#     logger.info("This is an info message.")
#     logger.warning("This is a warning message.")
#     logger.error("This is an error message.")
#     logger.critical("This is a critical message.")

```