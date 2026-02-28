import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    """
    Configures logging for the Flask application.
    Logs to console and a rotating file.
    """
    log_level_str = app.config.get('LOG_LEVEL', 'INFO')
    numeric_level = getattr(logging, log_level_str.upper(), logging.INFO)

    app.logger.setLevel(numeric_level)

    # Remove default Flask handlers to avoid duplicate logs
    for handler in app.logger.handlers:
        app.logger.removeHandler(handler)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    app.logger.addHandler(console_handler)

    # File handler (only in non-testing environments)
    if not app.testing:
        log_dir = 'logs'
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'ecommerce.log'),
            maxBytes=1024 * 1024 * 10, # 10 MB
            backupCount=5
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        app.logger.addHandler(file_handler)

    app.logger.info(f"Logging initialized with level: {log_level_str}")