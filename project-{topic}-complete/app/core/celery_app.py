```python
# app/core/celery_app.py
from celery import Celery

celery_app = Celery(__name__)

def init_celery(app):
    """
    Initializes the Celery application with Flask app context.
    """
    celery_app.conf.broker_url = app.config['CELERY_BROKER_URL']
    celery_app.conf.result_backend = app.config['CELERY_RESULT_BACKEND']
    celery_app.conf.update(app.config)

    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask
    
    # Configure Celery Beat Schedule (if using db scheduler for dynamic tasks)
    # For a simple fixed schedule, you can define it here.
    # For dynamic schedule, you'd use a custom scheduler like Flask-SQLAlchemy-Celery-Beat
    # which is configured via `celery -A ... beat --scheduler flask_sqlalchemy.SQLAlchemyScheduler`
    # For now, let's add a basic static schedule example
    # celery_app.conf.beat_schedule = {
    #     'collect-metrics-every-5-minutes': {
    #         'task': 'app.tasks.metric_collection_tasks.collect_and_analyze_metrics_task',
    #         'schedule': timedelta(minutes=5),
    #         'args': (True,) # Example argument if needed
    #     },
    # }
    # celery_app.conf.timezone = 'UTC'

    return celery_app
```