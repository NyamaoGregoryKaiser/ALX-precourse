import sys
from loguru import logger
from app.core.config import settings

# Remove default handler
logger.remove()

# Add a handler for stdout with a specific format and level
logger.add(
    sys.stdout,
    level=settings.LOG_LEVEL,
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
    colorize=True,
    backtrace=True,
    diagnose=True
)

# Optional: Add a handler for a file
# logger.add(
#     "logs/file.log",
#     level="DEBUG",
#     rotation="10 MB", # Rotate log file every 10 MB
#     compression="zip", # Compress old log files
#     serialize=True, # Log as JSON
#     backtrace=True,
#     diagnose=True
# )

# You can also customize default logger behavior further
logger.opt(colors=True)

```

#### `app/core/exceptions.py`
```python