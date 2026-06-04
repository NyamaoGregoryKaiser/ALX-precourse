```python
import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    """
    Sets up application-wide logging.
    """
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(app.config['LOG_FILE_PATH'])
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)

        # File handler for general logs
        file_handler = RotatingFileHandler(
            app.config['LOG_FILE_PATH'],
            maxBytes=1024 * 1024 * 10, # 10 MB
            backupCount=10 # Keep up to 10 log files
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(getattr(logging, app.config['LOG_LEVEL'].upper()))
        app.logger.addHandler(file_handler)

        # Console handler for easier development/docker logs (still active in prod for stdout)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s'
        ))
        console_handler.setLevel(getattr(logging, app.config['LOG_LEVEL'].upper()))
        app.logger.addHandler(console_handler)

    # Set the default logger level
    app.logger.setLevel(getattr(logging, app.config['LOG_LEVEL'].upper()))
    app.logger.propagate = False # Prevent messages from being passed to the root logger
```