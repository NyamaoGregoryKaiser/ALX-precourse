from datetime import datetime
from app.models.scraping_job import ScrapingJob, JobStatus
from app.models.scraper_config import ScraperConfig
from app.utils.errors import NotFoundError, BadRequestError, ForbiddenError
from app import db, cache, celery_app, current_app
from app.tasks.scraping_tasks import run_scraping_job # Import task for delayed execution

class ScrapingJobService:
    @staticmethod
    def create_scraping_job(user_id, config_id):
        config = ScraperConfig.get_by_id(config_id, user_id)
        if not config:
            raise NotFoundError(f"Scraper config with ID {config_id} not found or not owned by user.")
        if not config.is_active:
            raise BadRequestError(f"Scraper config with ID {config_id} is not active and cannot be run.")

        # Create the job in PENDING state
        job = ScrapingJob(
            scraper_config_id=config_id,
            user_id=user_id,
            status=JobStatus.PENDING
        )
        job.save()

        # Enqueue the job with Celery
        # Pass job ID to the task for status updates and result storage
        celery_task = run_scraping_job.apply_async(args=[job.id])
        job.celery_task_id = celery_task.id
        job.save()

        # Clear relevant cache entries
        cache.delete_memoized(ScrapingJobService.get_all_scraping_jobs, user_id)
        current_app.logger.info(f"Scraping job {job.id} created and enqueued for config {config_id} by user {user_id}.")
        return job

    @staticmethod
    @cache.memoize(timeout=60) # Cache for 1 minute
    def get_all_scraping_jobs(user_id, status=None):
        jobs = ScrapingJob.get_all(user_id=user_id, status=status)
        current_app.logger.debug(f"Retrieved {len(jobs)} scraping jobs for user {user_id} with status {status}.")
        return jobs

    @staticmethod
    @cache.memoize(timeout=60)
    def get_scraping_job_by_id(job_id, user_id):
        job = ScrapingJob.get_by_id(job_id, user_id=user_id)
        if not job:
            raise NotFoundError(f"Scraping job with ID {job_id} not found or not owned by user.")
        current_app.logger.debug(f"Retrieved scraping job {job_id} for user {user_id}.")
        return job

    @staticmethod
    def cancel_scraping_job(job_id, user_id):
        job = ScrapingJobService.get_scraping_job_by_id(job_id, user_id)

        if job.status not in [JobStatus.PENDING, JobStatus.RUNNING]:
            raise BadRequestError(f"Job {job_id} is in status {job.status.value} and cannot be cancelled.")

        if job.celery_task_id:
            # Attempt to revoke the Celery task
            celery_app.control.revoke(job.celery_task_id, terminate=True, signal='SIGTERM')
            current_app.logger.warning(f"Attempted to revoke Celery task {job.celery_task_id} for job {job_id}.")

        job.status = JobStatus.CANCELLED
        job.finished_at = datetime.utcnow()
        job.error_message = "Job cancelled by user."
        job.save()

        cache.delete_memoized(ScrapingJobService.get_all_scraping_jobs, user_id)
        cache.delete_memoized(ScrapingJobService.get_scraping_job_by_id, job_id, user_id)
        current_app.logger.info(f"Scraping job {job_id} cancelled by user {user_id}.")
        return job

    @staticmethod
    def delete_scraping_job(job_id, user_id):
        job = ScrapingJobService.get_scraping_job_by_id(job_id, user_id)
        # Ensure job is not running before deletion
        if job.status in [JobStatus.PENDING, JobStatus.RUNNING]:
            raise BadRequestError(f"Job {job_id} is currently {job.status.value}. Please cancel it first before deleting.")

        job.delete()
        cache.delete_memoized(ScrapingJobService.get_all_scraping_jobs, user_id)
        cache.delete_memoized(ScrapingJobService.get_scraping_job_by_id, job_id, user_id)
        current_app.logger.info(f"Scraping job {job_id} deleted by user {user_id}.")
```