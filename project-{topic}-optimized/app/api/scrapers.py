from flask import request, jsonify, g, current_app
from app.api import bp
from app.schemas.scraper import ScraperConfigCreate, ScraperConfigUpdate, ScraperConfigResponse
from app.auth.decorators import token_required
from app.services.scraper_service import ScraperConfigService
from pydantic import ValidationError
from app.utils.errors import BadRequestError, NotFoundError, APIError
from app import limiter

@bp.route('/scrapers', methods=['POST'])
@token_required
@limiter.limit("50 per day; 5 per hour", error_message="Rate limit exceeded for creating scrapers.")
def create_scraper():
    user_id = g.current_user.id
    try:
        data = ScraperConfigCreate(**request.json)
    except ValidationError as e:
        raise BadRequestError("Invalid scraper configuration data", payload=e.errors())

    try:
        config = ScraperConfigService.create_scraper_config(user_id, **data.model_dump())
        current_app.logger.info(f"User {user_id} created scraper config {config.id}.")
        return ScraperConfigResponse.model_validate(config).model_dump(), 201
    except APIError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Error creating scraper for user {user_id}: {e}", exc_info=True)
        raise BadRequestError(f"Failed to create scraper: {e}")

@bp.route('/scrapers', methods=['GET'])
@token_required
@limiter.limit("100 per day; 10 per hour", error_message="Rate limit exceeded for fetching scraper list.")
def get_all_scrapers():
    user_id = g.current_user.id
    configs = ScraperConfigService.get_all_scraper_configs(user_id)
    return jsonify([ScraperConfigResponse.model_validate(config).model_dump() for config in configs]), 200

@bp.route('/scrapers/<int:config_id>', methods=['GET'])
@token_required
@limiter.limit("200 per day; 20 per hour", error_message="Rate limit exceeded for fetching a single scraper.")
def get_scraper(config_id):
    user_id = g.current_user.id
    config = ScraperConfigService.get_scraper_config_by_id(config_id, user_id)
    current_app.logger.debug(f"User {user_id} fetched scraper config {config_id}.")
    return ScraperConfigResponse.model_validate(config).model_dump(), 200

@bp.route('/scrapers/<int:config_id>', methods=['PUT'])
@token_required
@limiter.limit("50 per day; 5 per hour", error_message="Rate limit exceeded for updating scrapers.")
def update_scraper(config_id):
    user_id = g.current_user.id
    try:
        data = ScraperConfigUpdate(**request.json)
        # Filter out unset fields to only update what's provided
        update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    except ValidationError as e:
        raise BadRequestError("Invalid scraper configuration data", payload=e.errors())

    try:
        config = ScraperConfigService.update_scraper_config(config_id, user_id, **update_data)
        current_app.logger.info(f"User {user_id} updated scraper config {config_id}.")
        return ScraperConfigResponse.model_validate(config).model_dump(), 200
    except APIError as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Error updating scraper {config_id} for user {user_id}: {e}", exc_info=True)
        raise BadRequestError(f"Failed to update scraper: {e}")

@bp.route('/scrapers/<int:config_id>', methods=['DELETE'])
@token_required
@limiter.limit("10 per day; 1 per hour", error_message="Rate limit exceeded for deleting scrapers.")
def delete_scraper(config_id):
    user_id = g.current_user.id
    ScraperConfigService.delete_scraper_config(config_id, user_id)
    current_app.logger.info(f"User {user_id} deleted scraper config {config_id}.")
    return jsonify({"message": f"Scraper config {config_id} deleted successfully."}), 204
```