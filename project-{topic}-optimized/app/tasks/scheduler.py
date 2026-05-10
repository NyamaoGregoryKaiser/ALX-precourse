from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.executors.asyncio import AsyncIOExecutor
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logger import logger
from app.services.data_collector import simulate_data_collection
from app.services.alert_evaluator import evaluate_alert_rules

_scheduler: AsyncIOScheduler | None = None

def get_scheduler() -> AsyncIOScheduler:
    """
    Returns the singleton APScheduler instance.
    Initializes it if not already done.
    """
    global _scheduler
    if _scheduler is None:
        executors = {
            'default': AsyncIOExecutor()
        }
        job_defaults = {
            'coalesce': True, # Only run once if multiple triggers occur at once
            'max_instances': 1 # Ensure only one instance of a job runs at a time
        }
        _scheduler = AsyncIOScheduler(executors=executors, job_defaults=job_defaults)
        logger.info("APScheduler instance created.")
    return _scheduler

def setup_scheduler_jobs(scheduler: AsyncIOScheduler):
    """
    Sets up and adds all background jobs to the scheduler.
    """
    # Helper to create async session for scheduled jobs
    async def get_db_session_for_job():
        async with SessionLocal() as session:
            yield session

    # Simulate data collection
    scheduler.add_job(
        simulate_data_collection,
        trigger=IntervalTrigger(seconds=settings.DATA_COLLECTION_INTERVAL_SECONDS),
        args=[SessionLocal()], # Pass SessionLocal directly to create session within job
        id='data_collector_job',
        name='Simulated Data Collector',
        replace_existing=True,
        max_instances=1
    )
    logger.info(f"Scheduled 'Simulated Data Collector' to run every {settings.DATA_COLLECTION_INTERVAL_SECONDS} seconds.")

    # Evaluate alert rules
    scheduler.add_job(
        evaluate_alert_rules,
        trigger=IntervalTrigger(seconds=settings.ALERT_EVALUATION_INTERVAL_SECONDS),
        args=[SessionLocal()], # Pass SessionLocal directly to create session within job
        id='alert_evaluator_job',
        name='Alert Rule Evaluator',
        replace_existing=True,
        max_instances=1
    )
    logger.info(f"Scheduled 'Alert Rule Evaluator' to run every {settings.ALERT_EVALUATION_INTERVAL_SECONDS} seconds.")

    logger.info("All scheduler jobs set up.")

```

#### `app/templates/index.html` (Simple Frontend)
```html