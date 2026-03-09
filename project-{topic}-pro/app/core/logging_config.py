import sys
from loguru import logger
from app.config import settings

# Remove default logger
logger.remove()

# Configure logging with colorized output, file logging, and appropriate levels
# This setup includes a default sink for stdout and can be extended for file logging,
# Sentry, or other monitoring tools.

def setup_logging():
    """
    Sets up the application's logging configuration using Loguru.
    Logs to stdout with colorization and to a file for persistent records.
    """
    logger.add(
        sys.stdout,
        level=settings.LOG_LEVEL,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        backtrace=True,
        diagnose=True,
    )

    # Optional: Add a file sink for production environments
    # For a real production system, consider log rotation, compression, etc.
    if settings.ENVIRONMENT == "production":
        log_file_path = "logs/app.log"
        logger.add(
            log_file_path,
            rotation="10 MB",  # Rotate file every 10 MB
            retention="7 days", # Keep logs for 7 days
            compression="zip",  # Compress rotated logs
            level=settings.LOG_LEVEL,
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
            enqueue=True # Use a separate thread for writing logs to files
        )

    logger.info(f"Logging configured successfully. Level: {settings.LOG_LEVEL}, Environment: {settings.ENVIRONMENT}")

# You can now use `logger` from loguru directly throughout your application
# Example:
# from app.core.logging_config import logger
# logger.info("This is an info message")
# logger.debug("This is a debug message")
# logger.error("This is an error message", exc_info=True)
```

```