```python
import logging
from backend.app.core.config import settings

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.setLevel(settings.LOG_LEVEL)

    # Prevent adding multiple handlers if already configured
    if not logger.handlers:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger

app_logger = get_logger("chat_app")
```