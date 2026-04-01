```python
import time
import requests
from datetime import datetime
from threading import Thread
import json

from flask import current_app
from performance_monitor.extensions import db, scheduler
from performance_monitor.services.service_monitoring import poll_endpoint_and_save_metric
from performance_monitor.models import Endpoint

def add_all_active_endpoints_to_scheduler(app):
    """
    Adds all active endpoints from the database to the APScheduler jobs.
    This should be called on application startup.
    """
    with app.app_context():
        endpoints = Endpoint.query.filter_by(is_active=True).all()
        for endpoint in endpoints:
            add_endpoint_to_scheduler(app, endpoint)
        app.logger.info(f"Added {len(endpoints)} active endpoints to scheduler.")

def add_endpoint_to_scheduler(app, endpoint):
    """
    Adds a single endpoint to the APScheduler job list.
    If a job for this endpoint already exists, it is replaced.
    """
    job_id = f"poll_endpoint_{endpoint.id}"
    interval = endpoint.polling_interval_seconds if endpoint.polling_interval_seconds > 0 else app.config['DEFAULT_POLLING_INTERVAL_SECONDS']
    
    # Ensure interval is at least 5 seconds to prevent excessive polling
    if interval < 5:
        app.logger.warning(f"Endpoint {endpoint.id} has a very low polling interval ({interval}s). Setting to minimum 5s.")
        interval = 5

    with app.app_context():
        # Remove existing job if it exists
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)

        scheduler.add_job(
            id=job_id,
            func=poll_endpoint_and_save_metric,
            args=[app, endpoint.id], # Pass app instance and endpoint ID
            trigger='interval',
            seconds=interval,
            replace_existing=True,
            misfire_grace_time=60 # Allow jobs to run if missed by up to 60 seconds
        )
    current_app.logger.info(f"Scheduler job '{job_id}' added/updated for endpoint {endpoint.id} with interval {interval}s.")

def remove_endpoint_from_scheduler(endpoint_id):
    """
    Removes an endpoint's polling job from the scheduler.
    """
    job_id = f"poll_endpoint_{endpoint_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        current_app.logger.info(f"Scheduler job '{job_id}' removed.")

def start_scheduler_job(app):
    """Initializes and starts the APScheduler."""
    if not scheduler.running:
        scheduler.start()
        # Add all active endpoints to the scheduler on startup
        # This needs to run in a separate thread or after app context is fully set up
        # to avoid blocking the main thread or issues with DB connections.
        # A simple solution for this example: add jobs after a short delay or in a thread.
        # For simplicity, we'll call it directly after starting scheduler.
        # In a real-world scenario, you might use a dedicated worker process.
        Thread(target=lambda: add_all_active_endpoints_to_scheduler(app)).start()
        app.logger.info("APScheduler started.")
    else:
        app.logger.info("APScheduler is already running.")

def stop_scheduler_job(app):
    """Shuts down the APScheduler."""
    if scheduler.running:
        scheduler.shutdown()
        app.logger.info("APScheduler shut down.")
    else:
        app.logger.info("APScheduler is not running.")

```