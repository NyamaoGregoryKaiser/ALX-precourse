```python
import logging
import os
from app.config import get_config_class

def setup_logging(app):
    """
    Configures application logging.
    Logs to console and potentially to a file in production.
    """
    config = get_config_class()
    log_level = config.LOG_LEVEL

    # Clear existing handlers
    if app.logger.handlers:
        for handler in app.logger.handlers:
            app.logger.removeHandler(handler)

    # Set up basic console logging
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)
    app.logger.propagate = False # Prevent double logging if root logger is configured

    # Add file handler for production environment
    if config.FLASK_ENV == 'production' and not app.testing:
        log_dir = 'logs'
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        file_handler = logging.FileHandler(os.path.join(log_dir, 'cms_app.log'))
        file_handler.setFormatter(formatter)
        file_handler.setLevel(log_level)
        app.logger.addHandler(file_handler)

    app.logger.info(f"Logging initialized with level: {log_level} for environment: {config.FLASK_ENV}")

```