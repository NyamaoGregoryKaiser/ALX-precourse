import logging
from logging.config import dictConfig
import json
import sys

def setup_logging(log_level: str = "INFO", log_format_str: str = None):
    """
    Configures structured logging for the application.
    Defaults to JSON format for better compatibility with log aggregators.
    """
    if not log_format_str:
        log_format_str = '{"level": "%(levelname)s", "time": "%(asctime)s", "message": "%(message)s", "module": "%(name)s"}'

    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": log_format_str
            },
            "standard": {
                "format": "%(levelname)s:     %(asctime)s - %(name)s - %(message)s"
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json", # Use JSON formatter
                "stream": sys.stdout,
            },
        },
        "loggers": {
            "root": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": True,
            },
            "app": { # Specific logger for your application modules
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn": { # Uvicorn logs
                "handlers": ["console"],
                "level": "INFO", # Keep Uvicorn logs at INFO or higher to avoid verbosity
                "propagate": False,
            },
            "uvicorn.access": { # Uvicorn access logs
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "sqlalchemy": { # SQLAlchemy logs
                "handlers": ["console"],
                "level": "WARNING", # Keep SQLAlchemy logs at WARNING or higher
                "propagate": False,
            },
            "alembic": { # Alembic logs
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "fastapi": { # FastAPI framework logs
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "fastapi_cache": { # FastAPI Cache logs
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "fastapi_limiter": { # FastAPI Limiter logs
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            }
        },
    }

    # If pythonjsonlogger is not installed, fallback to standard formatter
    try:
        import pythonjsonlogger.jsonlogger
    except ImportError:
        LOGGING_CONFIG["formatters"]["json"] = LOGGING_CONFIG["formatters"]["standard"]
        logging.warning("python-json-logger not found, falling back to standard logging format.")

    dictConfig(LOGGING_CONFIG)
    logging.getLogger("root").setLevel(log_level)
    logging.getLogger("app").setLevel(log_level)
    logging.info(f"Logging initialized with level: {log_level}")

# Ensure pythonjsonlogger is in requirements.txt
# If not, add it: pythonjsonlogger==2.0.7 (or latest)
```