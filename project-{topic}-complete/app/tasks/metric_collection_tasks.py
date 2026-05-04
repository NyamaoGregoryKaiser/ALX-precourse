```python
# app/tasks/metric_collection_tasks.py
from app.core.celery_app import celery_app
from app.core.db import db
from app.models.target_db_model import TargetDatabase
from app.models.performance_metric_model import PerformanceMetric
from app.services.metric_service import MetricService
from app.utils.logger import logger
from celery.schedules import crontab # For defining periodic tasks

@celery_app.task(bind=True, max_retries=5, default_retry_delay=300) # Retry after 5 minutes
def collect_and_analyze_metrics_task(self, target_db_id: int):
    """
    Celery task to collect metrics for a specific target database
    and then analyze any newly collected slow query metrics.
    """
    try:
        logger.info(f"Starting metric collection for target DB ID: {target_db_id}")
        
        target_db = TargetDatabase.get_by_id(target_db_id)
        if not target_db:
            logger.error(f"Target database with ID {target_db_id} not found for metric collection.")
            return False

        # 1. Collect Metrics
        new_metrics = MetricService.collect_metrics_from_target_db(target_db_id)
        
        # 2. Analyze newly collected metrics, especially slow queries
        generated_suggestions_count = 0
        for metric in new_metrics:
            if metric.metric_type == 'slow_query_active' and not metric.analyzed:
                suggestions = MetricService.analyze_slow_query_for_suggestions(metric)
                generated_suggestions_count += len(suggestions)
        
        logger.info(f"Finished metric collection and analysis for target DB ID: {target_db_id}. "
                    f"Collected {len(new_metrics)} new metrics, generated {generated_suggestions_count} suggestions.")
        return True
    except Exception as e:
        logger.error(f"Task failed for target DB ID {target_db_id}: {e}", exc_info=True)
        self.retry(exc=e) # Retry the task on failure
        return False

@celery_app.task
def schedule_all_active_db_metric_collection():
    """
    Celery task to schedule metric collection for all active target databases.
    This task can be run periodically by Celery Beat.
    """
    logger.info("Scheduling metric collection for all active target databases...")
    active_dbs = TargetDatabase.query.filter_by(is_active=True).all()
    if not active_dbs:
        logger.info("No active target databases found to collect metrics from.")
        return

    for db_instance in active_dbs:
        collect_and_analyze_metrics_task.delay(db_instance.id) # Use .delay() for async execution
        logger.info(f"Scheduled metric collection for '{db_instance.name}' (ID: {db_instance.id}).")
    logger.info(f"Scheduled metric collection for {len(active_dbs)} active databases.")


# --- Celery Beat Schedule (Dynamic if using DB scheduler or static here) ---
# For demonstration, we'll put a static schedule here.
# In a real app, you might use a DB-backed scheduler or define in celery_app.py
# If using `celery -A app.core.celery_app.celery_app beat --scheduler=flask_sqlalchemy.SQLAlchemyScheduler`
# you would define PeriodicTask objects in the DB.

celery_app.conf.beat_schedule = {
    'run-all-db-metric-collection-every-15-minutes': {
        'task': 'app.tasks.metric_collection_tasks.schedule_all_active_db_metric_collection',
        'schedule': crontab(minute='*/15'), # Every 15 minutes
        'args': (),
    },
}
celery_app.conf.timezone = 'UTC'
```