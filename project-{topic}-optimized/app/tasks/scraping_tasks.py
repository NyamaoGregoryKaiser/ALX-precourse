from datetime import datetime
from app.tasks.celery_app import celery
from app import db
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraper_config import ScraperConfig
from app.models.scraping_result import ScrapingResult
from app.scraper.core import ScraperCore
from app import current_app # For logging within task

@celery.task(bind=True, max_retries=3, default_retry_delay=300) # retry after 5 mins
def run_scraping_job(self, job_id):
    """
    Celery task to execute a scraping job.
    """
    job = None
    with current_app.app_context():
        try:
            job = db.session.get(ScrapingJob, job_id)
            if not job:
                current_app.logger.error(f"Task {self.request.id}: Job {job_id} not found.")
                return

            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                current_app.logger.warning(f"Task {self.request.id}: Job {job_id} already in final state: {job.status.value}. Skipping.")
                return

            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            db.session.add(job)
            db.session.commit()
            current_app.logger.info(f"Task {self.request.id}: Started scraping for Job {job_id}.")

            config = db.session.get(ScraperConfig, job.scraper_config_id)
            if not config:
                raise ValueError(f"ScraperConfig {job.scraper_config_id} not found for Job {job_id}.")

            scraper = ScraperCore(
                config_name=config.name,
                start_url=config.start_url,
                css_selectors=config.css_selectors
            )
            scraped_data = scraper.scrape()

            if scraped_data:
                result = ScrapingResult(
                    job_id=job.id,
                    data=scraped_data['data'],
                    url=scraped_data['url']
                )
                db.session.add(result)

            job.status = JobStatus.COMPLETED
            job.finished_at = datetime.utcnow()
            db.session.add(job)
            db.session.commit()
            current_app.logger.info(f"Task {self.request.id}: Job {job_id} completed successfully.")

        except Exception as e:
            current_app.logger.error(f"Task {self.request.id}: Error processing Job {job_id}: {e}", exc_info=True)
            if job:
                job.status = JobStatus.FAILED
                job.finished_at = datetime.utcnow()
                job.error_message = str(e)
                db.session.add(job)
                db.session.commit()

            # Retry logic
            try:
                self.retry(exc=e)
            except self.MaxRetriesExceededError:
                current_app.logger.error(f"Task {self.request.id}: Max retries exceeded for Job {job_id}.")

@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Example of a periodic task
    # sender.add_periodic_task(
    #     crontab(hour=7, minute=30, day_of_week=1), # Every Monday at 7:30 am
    #     debug_task.s('Hello from Celery Beat!')
    # )
    pass

@celery.task
def debug_task(message):
    with current_app.app_context():
        current_app.logger.info(f"Debug task received: {message}")
```