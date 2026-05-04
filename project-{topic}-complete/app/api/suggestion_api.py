```python
# app/api/suggestion_api.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.suggestion_service import SuggestionService
from app.services.target_db_service import TargetDBService
from app.utils.errors import BadRequestError, NotFoundError, ForbiddenError
from app.utils.logger import logger

suggestion_bp = Blueprint('suggestion', __name__)

@suggestion_bp.route('/', methods=['POST'])
@jwt_required()
def create_suggestion():
    """
    Creates a new optimization suggestion.
    ---
    post:
      summary: Create a new optimization suggestion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                target_db_id:
                  type: integer
                suggestion_type:
                  type: string
                  enum: [index_creation, query_rewrite, schema_change, configuration_tune]
                description:
                  type: string
                sql_statement:
                  type: string
                  nullable: true
                priority:
                  type: string
                  enum: [low, medium, high, critical]
                  default: medium
                metric_id:
                  type: integer
                  nullable: true
              required:
                - target_db_id
                - suggestion_type
                - description
      security:
        - BearerAuth: []
      responses:
        201:
          description: Suggestion created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OptimizationSuggestion'
        400:
          description: Bad request
        404:
          description: Target database not found or not owned by user
        403:
          description: Forbidden (not authorized to create suggestion for this DB)
        401:
          description: Unauthorized
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")
    
    target_db_id = data.get('target_db_id')
    suggestion_type = data.get('suggestion_type')
    description = data.get('description')
    sql_statement = data.get('sql_statement')
    priority = data.get('priority', 'medium')
    metric_id = data.get('metric_id')
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    if not all([target_db_id, suggestion_type, description]):
        raise BadRequestError("Target DB ID, suggestion type, and description are required.")
    
    try:
        # Verify user has access to this target_db
        TargetDBService.get_target_db_by_id(target_db_id, None if is_admin else current_user_id)
        
        suggestion = SuggestionService.create_suggestion(
            target_db_id=target_db_id,
            suggestion_type=suggestion_type,
            description=description,
            sql_statement=sql_statement,
            priority=priority,
            suggested_by_user_id=current_user_id,
            metric_id=metric_id
        )
        return jsonify(suggestion.to_dict()), 201
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except ForbiddenError as e:
        raise ForbiddenError(e.message)
    except Exception as e:
        logger.exception("Error creating optimization suggestion.")
        raise BadRequestError(f"Failed to create suggestion: {str(e)}")


@suggestion_bp.route('/', methods=['GET'])
@jwt_required()
def get_suggestions():
    """
    Retrieves a list of optimization suggestions, filtered by target DB, status, or priority.
    ---
    get:
      summary: Get optimization suggestions
      parameters:
        - in: query
          name: target_db_id
          schema:
            type: integer
          description: Filter by target database ID
        - in: query
          name: status
          schema:
            type: string
            enum: [pending, applied, ignored, resolved]
          description: Filter by status
        - in: query
          name: priority
          schema:
            type: string
            enum: [low, medium, high, critical]
          description: Filter by priority
      security:
        - BearerAuth: []
      responses:
        200:
          description: List of optimization suggestions
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/OptimizationSuggestion'
        401:
          description: Unauthorized
    """
    target_db_id = request.args.get('target_db_id', type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')

    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        # If target_db_id is provided, ensure user has access to it
        if target_db_id:
            TargetDBService.get_target_db_by_id(target_db_id, None if is_admin else current_user_id)
        
        suggestions = SuggestionService.get_all_suggestions(target_db_id, status, priority)
        
        # Filter suggestions to only show those for dbs owned by the user if not admin
        if not is_admin:
            suggestions = [s for s in suggestions if s.target_db.owner_id == current_user_id]

        return jsonify([s.to_dict() for s in suggestions]), 200
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except ForbiddenError as e:
        raise ForbiddenError(e.message)
    except Exception as e:
        logger.exception("Error retrieving optimization suggestions.")
        raise BadRequestError(f"Failed to retrieve suggestions: {str(e)}")


@suggestion_bp.route('/<int:suggestion_id>', methods=['GET'])
@jwt_required()
def get_suggestion(suggestion_id):
    """
    Retrieves a single optimization suggestion by its ID.
    ---
    get:
      summary: Get an optimization suggestion by ID
      parameters:
        - in: path
          name: suggestion_id
          schema:
            type: integer
          required: true
          description: ID of the suggestion to retrieve
      security:
        - BearerAuth: []
      responses:
        200:
          description: Optimization suggestion data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OptimizationSuggestion'
        404:
          description: Suggestion not found or not accessible
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'
    
    try:
        suggestion = SuggestionService.get_suggestion_by_id(suggestion_id)
        if not is_admin and suggestion.target_db.owner_id != current_user_id:
            raise ForbiddenError("You do not have permission to access this suggestion.")
        return jsonify(suggestion.to_dict()), 200
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except ForbiddenError as e:
        raise ForbiddenError(e.message)
    except Exception as e:
        logger.exception(f"Error retrieving suggestion {suggestion_id}.")
        raise BadRequestError(f"Failed to retrieve suggestion: {str(e)}")


@suggestion_bp.route('/<int:suggestion_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_suggestion(suggestion_id):
    """
    Updates an existing optimization suggestion.
    ---
    put:
      summary: Update an optimization suggestion
      parameters:
        - in: path
          name: suggestion_id
          schema:
            type: integer
          required: true
          description: ID of the suggestion to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                description:
                  type: string
                sql_statement:
                  type: string
                  nullable: true
                priority:
                  type: string
                  enum: [low, medium, high, critical]
                status:
                  type: string
                  enum: [pending, applied, ignored, resolved]
      security:
        - BearerAuth: []
      responses:
        200:
          description: Suggestion updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OptimizationSuggestion'
        400:
          description: Bad request
        404:
          description: Suggestion not found or not accessible
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
        suggestion = SuggestionService.get_suggestion_by_id(suggestion_id)
        if not is_admin and suggestion.target_db.owner_id != current_user_id:
            raise ForbiddenError("You do not have permission to update this suggestion.")
            
        updated_suggestion = SuggestionService.update_suggestion(suggestion_id, data)
        return jsonify(updated_suggestion.to_dict()), 200
    except (NotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        logger.exception(f"Error updating suggestion {suggestion_id}.")
        raise BadRequestError(f"Failed to update suggestion: {str(e)}")


@suggestion_bp.route('/<int:suggestion_id>', methods=['DELETE'])
@jwt_required()
def delete_suggestion(suggestion_id):
    """
    Deletes an optimization suggestion.
    ---
    delete:
      summary: Delete an optimization suggestion by ID
      parameters:
        - in: path
          name: suggestion_id
          schema:
            type: integer
          required: true
          description: ID of the suggestion to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: Suggestion deleted successfully
        404:
          description: Suggestion not found or not accessible
        403:
          description: Forbidden (only admin or owner can delete)
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        suggestion = SuggestionService.get_suggestion_by_id(suggestion_id)
        if not is_admin and suggestion.target_db.owner_id != current_user_id:
            raise ForbiddenError("You do not have permission to delete this suggestion.")

        SuggestionService.delete_suggestion(suggestion_id)
        return jsonify({"message": "Suggestion deleted successfully"}), 204
    except (NotFoundError, ForbiddenError) as e:
        raise e
    except Exception as e:
        logger.exception(f"Error deleting suggestion {suggestion_id}.")
        raise BadRequestError(f"Failed to delete suggestion: {str(e)}")

# Define OpenAPI Schema for OptimizationSuggestion
"""
components:
  schemas:
    OptimizationSuggestion:
      type: object
      properties:
        id:
          type: integer
          readOnly: true
        target_db_id:
          type: integer
        metric_id:
          type: integer
          nullable: true
        suggestion_type:
          type: string
          enum: [index_creation, query_rewrite, schema_change, configuration_tune]
        description:
          type: string
        sql_statement:
          type: string
          nullable: true
        priority:
          type: string
          enum: [low, medium, high, critical]
        status:
          type: string
          enum: [pending, applied, ignored, resolved]
        suggested_by_user_id:
          type: integer
          nullable: true
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
        - suggestion_type
        - description
"""
```