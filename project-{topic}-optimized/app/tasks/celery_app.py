# This file defines the Celery application instance that worker and beat processes will use.
from app import celery_app as main_celery_app

# The celery_app object from app/__init__.py is already configured.
# We just need to expose it here for Celery worker/beat to find.
celery = main_celery_app
```