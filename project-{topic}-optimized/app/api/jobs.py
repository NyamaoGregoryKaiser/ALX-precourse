from flask import request, jsonify, g, current_app
from app.api import bp
from app.schemas.job import ScrapingJobCreate, ScrapingJobResponse, JobStatusEnum
from app.auth.decorators import token_required
from app.services.job_service import ScrapingJobService
from pydantic import ValidationError
from app.utils.errors import BadRequestError, NotFoundError, APIError
from app import limiter

@bp.route('/jobs', methods=['POST'])
@token_required
@limiter.limit("10 per minute", error_message="Rate limit exceeded for creating scraping jobs.")
def create_job():
    user_id = g.current_user.id
    try:
        data = ScrapingJobCreate(**request.json)
    except ValidationError as e:
        raise BadRequestError("Invalid job creation data", payload=e.errors())

    try:
        job = ScrapingJobService.create_scraping_job(user_id, data.scraper_config_id)
        current_app.logger.info(f"User {user_id} created job {job.id} for config {data.scraper_config_id}.")
        return ScrapingJobResponse.model_validate(job).model_dump(), 201
    except APIError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Error creating job for user {user_id} and config {data.scraper_config_id}: {e}", exc_info=True)
        raise BadRequestError(f"Failed to create job: {e}")

@bp.route('/jobs', methods=['GET'])
@token_required
@limiter.limit("60 per hour", error_message="Rate limit exceeded for fetching job list.")
def get_all_jobs():
    user_id = g.current_user.id
    status_filter = request.args.get('status')
    if status_filter and status_filter.upper() not in [s.value for s in JobStatusEnum]:
        raise BadRequestError(f"Invalid status filter: {status_filter}. Must be one of {list(JobStatusEnum)}")

    jobs = ScrapingJobService.get_all_scraping_jobs(user_id, status=status_filter)
    return jsonify([ScrapingJobResponse.model_validate(job).model_dump() for job in jobs]), 200

@bp.route('/jobs/<int:job_id>', methods=['GET'])
@token_required
@limiter.limit("120 per hour", error_message="Rate limit exceeded for fetching a single job.")
def get_job(job_id):
    user_id = g.current_user.id
    job = ScrapingJobService.get_scraping_job_by_id(job_id, user_id)
    current_app.logger.debug(f"User {user_id} fetched job {job_id}.")
    return ScrapingJobResponse.model_validate(job).model_dump(), 200

@bp.route('/jobs/<int:job_id>/cancel', methods=['POST'])
@token_required
@limiter.limit("5 per hour", error_message="Rate limit exceeded for cancelling jobs.")
def cancel_job(job_id):
    user_id = g.current_user.id
    try:
        job = ScrapingJobService.cancel_scraping_job(job_id, user_id)
        current_app.logger.info(f"User {user_id} cancelled job {job_id}.")
        return ScrapingJobResponse.model_validate(job).model_dump(), 200
    except APIError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Error cancelling job {job_id} for user {user_id}: {e}", exc_info=True)
        raise BadRequestError(f"Failed to cancel job: {e}")

@bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@token_required
@limiter.limit("10 per day; 2 per hour", error_message="Rate limit exceeded for deleting jobs.")
def delete_job(job_id):
    user_id = g.current_user.id
    ScrapingJobService.delete_scraping_job(job_id, user_id)
    current_app.logger.info(f"User {user_id} deleted job {job_id}.")
    return jsonify({"message": f"Scraping job {job_id} deleted successfully."}), 204
```