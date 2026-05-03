import logging
from loguru import logger
import sys
from app.core.config import settings
import os

class InterceptHandler(logging.Handler):
    """
    Intercepts standard logging messages and redirects them to Loguru.
    """
    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

def setup_logging():
    """
    Configures logging for the application, using Loguru for structured logging
    and redirecting standard library logging to Loguru.
    """
    # Remove default Loguru handler to prevent duplicate logs
    logger.remove()

    # Add a sink for console output
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
        backtrace=True,
        diagnose=True,
    )

    # Add a sink for file output, with rotation and retention
    log_dir = os.path.dirname(settings.LOG_FILE_PATH)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logger.add(
        settings.LOG_FILE_PATH,
        level=settings.LOG_LEVEL,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation=f"{settings.LOG_ROTATION_SIZE_MB} MB",
        retention=f"{settings.LOG_RETENTION_DAYS} days",
        compression="zip",
        enqueue=True, # Use multiprocessing-safe queue
        backtrace=True,
        diagnose=True,
    )

    # Configure standard logging to use Loguru
    logging.basicConfig(handlers=[InterceptHandler()], level=0)
    logging.getLogger("uvicorn").handlers = [InterceptHandler()]
    logging.getLogger("uvicorn.access").handlers = [InterceptHandler()]
    logging.getLogger("sqlalchemy").handlers = [InterceptHandler()]
    logging.getLogger("alembic").handlers = [InterceptHandler()]

    # Suppress verbose loggers if not in debug mode
    if not settings.DEBUG:
        logging.getLogger("uvicorn").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("asyncio").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)

    logger.info(f"Logging initialized with level: {settings.LOG_LEVEL}")
    logger.info(f"Logs will be written to: {settings.LOG_FILE_PATH}")

```