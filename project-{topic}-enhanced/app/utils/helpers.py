from flask import jsonify
import logging
from app.utils.errors import APIError

logger = logging.getLogger(__name__)

def handle_api_error(e):
    if isinstance(e, APIError):
        logger.warning(f"API Error ({e.status_code}): {e.message}")
        return jsonify(e.to_dict()), e.status_code
    
    logger.exception(f"Unhandled exception: {e}")
    return jsonify({"message": "An unexpected error occurred."}), 500

def log_request_data(request):
    """Logs relevant request data."""
    log_msg = f"Request: {request.method} {request.path}"
    if request.is_json:
        log_msg += f", JSON: {request.json}"
    elif request.form:
        log_msg += f", Form: {request.form}"
    logger.debug(log_msg)

def log_response_data(response):
    """Logs relevant response data."""
    log_msg = f"Response: Status {response.status_code}"
    # Avoid logging sensitive data or excessively large responses
    if 'Content-Type' in response.headers and 'application/json' in response.headers['Content-Type']:
        try:
            # log a truncated version of the JSON data if it's too large
            json_data = response.json
            if len(str(json_data)) > 500: # Truncate if over 500 characters
                log_msg += f", JSON (truncated): {str(json_data)[:497]}..."
            else:
                log_msg += f", JSON: {json_data}"
        except Exception:
            pass # Ignore if response.json fails
    logger.debug(log_msg)