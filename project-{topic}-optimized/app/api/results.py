from flask import jsonify, g, current_app
from app.api import bp
from app.schemas.result import ScrapingResultResponse
from app.auth.decorators import token_required
from app.services.result_service import ScrapingResultService
from app.utils.errors import APIError
from app import limiter

@bp.route('/jobs/<int:job_id>/results', methods=['GET'])
@token_required
@limiter.limit("200 per day; 20 per hour", error_message="Rate limit exceeded for fetching job results.")
def get_job_results(job_id):
    user_id = g.current_user.id
    try:
        results = ScrapingResultService.get_results_for_job(job_id, user_id)
        current_app.logger.debug(f"User {user_id} fetched results for job {job_id}.")
        return jsonify([ScrapingResultResponse.model_validate(result).model_dump() for result in results]), 200
    except APIError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Error fetching results for job {job_id} for user {user_id}: {e}", exc_info=True)
        raise e # Re-raise as a generic error if not handled by APIError

@bp.route('/results/<int:result_id>', methods=['GET'])
@token_required
@limiter.limit("200 per day; 20 per hour", error_message="Rate limit exceeded for fetching a single result.")
def get_result(result_id):
    user_id = g.current_user.id
    try:
        result = ScrapingResultService.get_result_by_id(result_id, user_id)
        current_app.logger.debug(f"User {user_id} fetched result {result_id}.")
        return ScrapingResultResponse.model_validate(result).model_dump(), 200
    except APIError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Error fetching result {result_id} for user {user_id}: {e}", exc_info=True)
        raise e
```