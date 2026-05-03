```python
"""
Centralized logging configuration for the ALX-Shop application.

This module sets up a structured logging system using Python's `logging` module.
It configures:
- A console handler for outputting logs to stdout/stderr.
- A custom log format including timestamp, logger name, level, function, line number, and message.
- Log level configurable via environment variables (`settings.LOG_LEVEL`).
"""

import logging
from app.core.config import settings

def setup_logging():
    """
    Configures the root logger for the application.

    - Sets the overall logging level based on `settings.LOG_LEVEL`.
    - Creates a `StreamHandler` to output logs to the console.
    - Defines a `Formatter` to control the structure and content of log messages.
    - Adds the handler to the root logger.
    """
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)

    # Prevent duplicate handlers if called multiple times (e.g., in tests)
    if not root_logger.handlers:
        # Create a console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(settings.LOG_LEVEL)

        # Create a formatter
        formatter = logging.Formatter(settings.LOG_FORMAT)
        console_handler.setFormatter(formatter)

        # Add the handler to the root logger
        root_logger.addHandler(console_handler)

        # Suppress verbose loggers from libraries if not in DEBUG mode
        if settings.LOG_LEVEL != "DEBUG":
            logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
            logging.getLogger("uvicorn.error").setLevel(logging.INFO)
            logging.getLogger("httpx").setLevel(logging.WARNING)
            logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
            logging.getLogger("fastapi_limiter").setLevel(logging.INFO)

    # Example log message to confirm setup
    logging.info(f"Logging configured with level: {settings.LOG_LEVEL}")
    logging.debug("Debug logging is enabled.")

```