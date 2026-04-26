```python
import logging
import os
from config import settings # Assuming settings can be imported from config

def get_logger(name: str) -> logging.Logger:
    """
    Configures and returns a logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(settings.LOG_LEVEL.upper())

    # Create handlers
    console_handler = logging.StreamHandler()
    console_handler.setLevel(settings.LOG_LEVEL.upper())

    # Create formatters and add it to handlers
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(formatter)

    # Add handlers to the logger
    if not logger.handlers: # Prevent adding duplicate handlers if called multiple times
        logger.addHandler(console_handler)

    # Example of Sentry integration (conceptual)
    # if settings.SENTRY_DSN:
    #     try:
    #         import sentry_sdk
    #         from sentry_sdk.integrations.logging import LoggingIntegration
    #         sentry_logging = LoggingIntegration(
    #             level=logging.INFO,        # Capture info and above as breadcrumbs
    #             event_level=logging.ERROR  # Send errors as events
    #         )
    #         sentry_sdk.init(
    #             dsn=settings.SENTRY_DSN,
    #             integrations=[sentry_logging],
    #             # Set traces_sample_rate to 1.0 to capture 100%
    #             # of transactions for performance monitoring.
    #             traces_sample_rate=1.0,
    #         )
    #         logger.info("Sentry SDK initialized for error monitoring.")
    #     except ImportError:
    #         logger.warning("Sentry SDK not installed. Skipping Sentry integration.")
    #     except Exception as e:
    #         logger.error(f"Failed to initialize Sentry SDK: {e}")

    return logger

```

**Error Handling Middleware**