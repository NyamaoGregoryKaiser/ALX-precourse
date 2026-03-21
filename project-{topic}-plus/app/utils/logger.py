import logging
from logging.handlers import RotatingFileHandler
import os
import json

class JsonFormatter(logging.Formatter):
    """
    A custom logging formatter that outputs logs in JSON format.
    """
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "pathname": record.pathname,
            "lineno": record.lineno,
            "funcName": record.funcName,
            "process": record.process,
            "thread": record.thread,
        }
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        if record.stack_info:
            log_record["stack_info"] = self.formatStack(record.stack_info)

        # Add any extra attributes from the log record
        for key, value in record.__dict__.items():
            if key not in log_record and not key.startswith('_') and key not in ['args', 'asctime', 'created', 'exc_text', 'filename', 'levelname', 'levelno', 'msecs', 'module', 'msg', 'pathname', 'processName', 'relativeCreated', 'stack_info', 'threadName']:
                log_record[key] = value

        return json.dumps(log_record)

def setup_logging(app):
    """
    Configures application logging.
    - Console handler for development.
    - Rotating file handler for persistent logs with JSON formatting.
    """
    log_level = app.config['LOG_LEVEL']
    log_file_path = app.config['LOG_FILE_PATH']
    log_max_bytes = app.config['LOG_MAX_BYTES']
    log_backup_count = app.config['LOG_BACKUP_COUNT']

    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(log_file_path)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Set root logger level
    app.logger.setLevel(log_level)

    # Remove default Flask handlers if any
    for handler in app.logger.handlers:
        app.logger.removeHandler(handler)

    # Console handler
    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(logging.DEBUG if app.debug else logging.INFO)
    app.logger.addHandler(console_handler)

    # File handler (for all environments, but especially important for production)
    file_handler = RotatingFileHandler(
        log_file_path,
        maxBytes=log_max_bytes,
        backupCount=log_backup_count
    )
    file_formatter = JsonFormatter('%(asctime)s') # JsonFormatter handles full formatting
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(logging.INFO) # Always log INFO and above to file
    app.logger.addHandler(file_handler)

    app.logger.info(f"Logging initialized. Level: {log_level}, File: {log_file_path}")
```