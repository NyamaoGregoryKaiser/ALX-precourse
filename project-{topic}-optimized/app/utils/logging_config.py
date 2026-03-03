import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    if not os.path.exists('logs'):
        os.mkdir('logs')

    log_file = os.path.join('logs', app.config['LOG_FILE'])
    file_handler = RotatingFileHandler(log_file, maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(app.config['LOG_LEVEL'])

    app.logger.addHandler(file_handler)
    app.logger.setLevel(app.config['LOG_LEVEL'])

    # Suppress werkzeug (Flask's internal server) access logs unless in DEBUG mode
    if not app.debug:
        logging.getLogger('werkzeug').setLevel(logging.ERROR)

    # Configure SQLAlchemy logger
    logging.getLogger('sqlalchemy.engine').setLevel(
        logging.INFO if app.config.get('SQLALCHEMY_ECHO') else logging.WARNING
    )
    logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.dialects.postgresql').setLevel(logging.WARNING)

    # Celery logging (will be configured separately for worker/beat processes)
    # but for app context, we can set its level
    logging.getLogger('celery').setLevel(app.config['LOG_LEVEL'])
```