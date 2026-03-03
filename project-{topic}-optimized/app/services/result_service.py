from app.models.scraping_result import ScrapingResult
from app.models.scraping_job import ScrapingJob
from app.utils.errors import NotFoundError, ForbiddenError
from app import db, cache, current_app

class ScrapingResultService:
    @staticmethod
    @cache.memoize(timeout=300) # Cache for 5 minutes
    def get_results_for_job(job_id, user_id):
        job = ScrapingJob.get_by_id(job_id, user_id)
        if not job:
            raise NotFoundError(f"Scraping job with ID {job_id} not found or not owned by user.")

        results = ScrapingResult.get_by_job_id(job_id, user_id)
        current_app.logger.debug(f"Retrieved {len(results)} results for job {job_id} by user {user_id}.")
        return results

    @staticmethod
    def get_result_by_id(result_id, user_id):
        result = ScrapingResult.query.get(result_id)
        if not result:
            raise NotFoundError(f"Scraping result with ID {result_id} not found.")

        # Check ownership through the associated job
        job = ScrapingJob.get_by_id(result.job_id, user_id)
        if not job: # This means the job doesn't exist or doesn't belong to the user
            raise ForbiddenError(f"Access to result {result_id} is forbidden.")
        current_app.logger.debug(f"Retrieved scraping result {result_id} for user {user_id}.")
        return result
```