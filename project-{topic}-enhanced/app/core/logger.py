```python
import sys
from loguru import logger
from app.core.config import settings

# Remove default logger to configure our own
logger.remove()

# Add a console logger with a custom format
logger.add(
    sys.stderr,
    level="INFO" if not settings.DEBUG else "DEBUG",
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level> {extra}"
    ),
    colorize=True,
    backtrace=True,
    diagnose=True,
)

# You can add more handlers here, e.g., to a file or an external logging service
# logger.add(
#     "logs/file_{time}.log",
#     level="INFO",
#     rotation="1 day", # New file every day
#     compression="zip", # Compress old log files
#     retention="7 days", # Keep logs for 7 days
#     format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message} {extra}",
# )

# Example of how to use it:
# from app.core.logger import logger
# logger.info("This is an info message")
# logger.debug("This is a debug message")
# logger.error("This is an error message", extra={"user_id": 123})
```