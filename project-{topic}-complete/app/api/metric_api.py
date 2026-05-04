```python
# app/api/metric_api.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.metric_service import MetricService
from app.services.target_db_service import TargetDBService
from app.tasks.metric_collection_tasks import collect_and_analyze_metrics_task
from app.utils.errors import BadRequestError, NotFoundError, ForbiddenError
from app.utils.logger import logger
from datetime import datetime

metric_bp = Blueprint('metric', __name__)

@metric_bp.route('/<int:target_db_id>/collect', methods=['POST'])
@jwt_required()
def trigger_metric_collection(target_db_id):
    """
    Triggers manual metric collection for a specific target database.
    ---
    post:
      summary: Trigger metric collection for a target database
      parameters:
        - in: path
          name: target_db_id
          schema:
            type: integer
          required: true
          description: ID of the target database
      security:
        - BearerAuth: []
      responses:
        202:
          description: Metric collection task started
        400:
          description: Bad request (e.g., connection error)
        404:
          description: Target database not found or not owned by user
        403:
          description: Forbidden (not authorized to collect for this DB)
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        target_db = TargetDBService.get_target_db_by_id(target_db_id, None if is_admin else current_user_id)
        
        # Start the Celery task
        task = collect_and_analyze_metrics_task.delay(target_db.id)
        
        return jsonify({
            "message": "Metric collection task initiated.",
            "task_id": task.id,
            "target_db_name": target_db.name
        }), 202
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except ForbiddenError as e:
        raise ForbiddenError(e.message)
    except BadRequestError as e:
        # Catch connection errors from MetricService if it was called directly,
        # but for async tasks, the error would be in task result
        raise BadRequestError(e.message)
    except Exception as e:
        logger.exception(f"Failed to initiate metric collection for DB {target_db_id}.")
        raise BadRequestError(f"Failed to initiate metric collection: {str(e)}")


@metric_bp.route('/<int:target_db_id>', methods=['GET'])
@jwt_required()
def get_db_metrics(target_db_id):
    """
    Retrieves performance metrics for a specific target database.
    ---
    get:
      summary: Get performance metrics for a target database
      parameters:
        - in: path
          name: target_db_id
          schema:
            type: integer
          required: true
          description: ID of the target database
        - in: query
          name: metric_type
          schema:
            type: string
          description: Filter by metric type (e.g., 'slow_query_active')
        - in: query
          name: start_date
          schema:
            type: string
            format: date
          description: Start date for filtering metrics (YYYY-MM-DD)
        - in: query
          name: end_date
          schema:
            type: string
            format: date
          description: End date for filtering metrics (YYYY-MM-DD)
      security:
        - BearerAuth: []
      responses:
        200:
          description: List of performance metrics
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/PerformanceMetric'
        404:
          description: Target database not found or not owned by user
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        # Verify user has access to this target_db
        TargetDBService.get_target_db_by_id(target_db_id, None if is_admin else current_user_id)
        
        metric_type = request.args.get('metric_type')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        start_date = datetime.fromisoformat(start_date_str) if start_date_str else None
        end_date = datetime.fromisoformat(end_date_str) if end_date_str else None

        metrics = MetricService.get_metrics_for_db(target_db_id, metric_type, start_date, end_date)
        return jsonify([metric.to_dict() for metric in metrics]), 200
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except ValueError:
        raise BadRequestError("Invalid date format. Use YYYY-MM-DD.")
    except Exception as e:
        logger.exception(f"Error retrieving metrics for DB {target_db_id}.")
        raise BadRequestError(f"Failed to retrieve metrics: {str(e)}")

@metric_bp.route('/<int:metric_id>', methods=['GET'])
@jwt_required()
def get_metric(metric_id):
    """
    Retrieves a single performance metric by its ID.
    ---
    get:
      summary: Get a performance metric by ID
      parameters:
        - in: path
          name: metric_id
          schema:
            type: integer
          required: true
          description: ID of the metric to retrieve
      security:
        - BearerAuth: []
      responses:
        200:
          description: Performance metric data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PerformanceMetric'
        404:
          description: Metric not found or not accessible
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        metric = MetricService.get_metric_by_id(metric_id)
        # Check if user owns the target_db associated with the metric or is admin
        if not is_admin and metric.target_db.owner_id != current_user_id:
            raise ForbiddenError("You do not have permission to access this metric.")
        return jsonify(metric.to_dict()), 200
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except ForbiddenError as e:
        raise ForbiddenError(e.message)
    except Exception as e:
        logger.exception(f"Error retrieving metric {metric_id}.")
        raise BadRequestError(f"Failed to retrieve metric: {str(e)}")


@metric_bp.route('/<int:metric_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_metric(metric_id):
    """
    Updates a performance metric (e.g., mark as analyzed).
    ---
    put:
      summary: Update a performance metric
      parameters:
        - in: path
          name: metric_id
          schema:
            type: integer
          required: true
          description: ID of the metric to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                is_anomaly:
                  type: boolean
                analyzed:
                  type: boolean
                metric_value:
                  type: object
      security:
        - BearerAuth: []
      responses:
        200:
          description: Metric updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PerformanceMetric'
        400:
          description: Bad request
        404:
          description: Metric not found or not accessible
        403:
          description: Forbidden (only admin or owner can update)
        401:
          description: Unauthorized
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")

    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        metric = MetricService.get_metric_by_id(metric_id)
        # Only admin or owner can update
        if not is_admin and metric.target_db.owner_id != current_user_id:
            raise ForbiddenError("You do not have permission to update this metric.")

        updated_metric = MetricService.update_metric(metric_id, data)
        return jsonify(updated_metric.to_dict()), 200
    except (NotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        logger.exception(f"Error updating metric {metric_id}.")
        raise BadRequestError(f"Failed to update metric: {str(e)}")

@metric_bp.route('/<int:metric_id>', methods=['DELETE'])
@jwt_required()
def delete_metric(metric_id):
    """
    Deletes a performance metric.
    ---
    delete:
      summary: Delete a performance metric by ID
      parameters:
        - in: path
          name: metric_id
          schema:
            type: integer
          required: true
          description: ID of the metric to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: Metric deleted successfully
        404:
          description: Metric not found or not accessible
        403:
          description: Forbidden (only admin or owner can delete)
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        metric = MetricService.get_metric_by_id(metric_id)
        # Only admin or owner can delete
        if not is_admin and metric.target_db.owner_id != current_user_id:
            raise ForbiddenError("You do not have permission to delete this metric.")
            
        MetricService.delete_metric(metric_id)
        return jsonify({"message": "Metric deleted successfully"}), 204
    except (NotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        logger.exception(f"Error deleting metric {metric_id}.")
        raise BadRequestError(f"Failed to delete metric: {str(e)}")

# Define OpenAPI Schema for PerformanceMetric
"""
components:
  schemas:
    PerformanceMetric:
      type: object
      properties:
        id:
          type: integer
          readOnly: true
        target_db_id:
          type: integer
        metric_type:
          type: string
          description: Type of metric (e.g., 'slow_query_active', 'index_usage_stats')
        metric_value:
          type: object
          description: JSON representation of the metric data
        timestamp:
          type: string
          format: date-time
        is_anomaly:
          type: boolean
        analyzed:
          type: boolean
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
        - target_db_id
        - metric_type
        - metric_value
        - timestamp
"""
```