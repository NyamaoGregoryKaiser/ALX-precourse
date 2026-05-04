```python
# app/api/target_db_api.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.target_db_service import TargetDBService
from app.utils.decorators import admin_required
from app.utils.errors import BadRequestError, NotFoundError, ConflictError, ForbiddenError
from app.utils.logger import logger

target_db_bp = Blueprint('target_db', __name__)

@target_db_bp.route('/', methods=['POST'])
@jwt_required()
def create_target_db():
    """
    Registers a new target database.
    ---
    post:
      summary: Register a new target database
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                db_type:
                  type: string
                connection_string:
                  type: string
              required:
                - name
                - db_type
                - connection_string
      security:
        - BearerAuth: []
      responses:
        201:
          description: Target database registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TargetDatabase'
        400:
          description: Bad request
        409:
          description: Conflict (database with same name already exists for user)
        401:
          description: Unauthorized
    """
    data = request.get_json()
    if not data:
        raise BadRequestError("Request body must be JSON.")
    
    name = data.get('name')
    db_type = data.get('db_type')
    connection_string = data.get('connection_string')
    owner_id = get_jwt_identity()

    if not all([name, db_type, connection_string]):
        raise BadRequestError("Name, db_type, and connection_string are required.")
    
    try:
        target_db = TargetDBService.create_target_db(name, db_type, connection_string, owner_id)
        return jsonify(target_db.to_dict()), 201
    except ConflictError as e:
        raise ConflictError(e.message)
    except Exception as e:
        logger.exception("Error creating target database.")
        raise BadRequestError(f"Failed to create target database: {str(e)}")


@target_db_bp.route('/', methods=['GET'])
@jwt_required()
def get_target_dbs():
    """
    Retrieves a list of target databases for the current user.
    Admins can see all databases.
    ---
    get:
      summary: Get all target databases for the current user (or all for admin)
      security:
        - BearerAuth: []
      responses:
        200:
          description: A list of target databases
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/TargetDatabase'
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    target_dbs = TargetDBService.get_all_target_dbs(None if is_admin else current_user_id)
    return jsonify([db.to_dict() for db in target_dbs]), 200


@target_db_bp.route('/<int:db_id>', methods=['GET'])
@jwt_required()
def get_target_db(db_id):
    """
    Retrieves a single target database by ID.
    ---
    get:
      summary: Get a target database by ID
      parameters:
        - in: path
          name: db_id
          schema:
            type: integer
          required: true
          description: ID of the target database
      security:
        - BearerAuth: []
      responses:
        200:
          description: Target database data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TargetDatabase'
        404:
          description: Target database not found or not owned by user
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'

    try:
        target_db = TargetDBService.get_target_db_by_id(db_id, None if is_admin else current_user_id)
        return jsonify(target_db.to_dict()), 200
    except NotFoundError as e:
        raise NotFoundError(e.message)


@target_db_bp.route('/<int:db_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_target_db(db_id):
    """
    Updates an existing target database.
    ---
    put:
      summary: Update a target database by ID
      parameters:
        - in: path
          name: db_id
          schema:
            type: integer
          required: true
          description: ID of the target database to update
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                db_type:
                  type: string
                connection_string:
                  type: string
                is_active:
                  type: boolean
      security:
        - BearerAuth: []
      responses:
        200:
          description: Target database updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TargetDatabase'
        400:
          description: Bad request
        404:
          description: Target database not found or not owned by user
        409:
          description: Conflict (database with same name already exists for user)
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
        target_db = TargetDBService.update_target_db(db_id, data, None if is_admin else current_user_id)
        return jsonify(target_db.to_dict()), 200
    except (NotFoundError, ConflictError) as e:
        raise e
    except Exception as e:
        logger.exception("Error updating target database.")
        raise BadRequestError(f"Failed to update target database: {str(e)}")


@target_db_bp.route('/<int:db_id>', methods=['DELETE'])
@jwt_required()
def delete_target_db(db_id):
    """
    Deletes a target database.
    ---
    delete:
      summary: Delete a target database by ID
      parameters:
        - in: path
          name: db_id
          schema:
            type: integer
          required: true
          description: ID of the target database to delete
      security:
        - BearerAuth: []
      responses:
        204:
          description: Target database deleted successfully
        404:
          description: Target database not found or not owned by user
        401:
          description: Unauthorized
    """
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'Admin'
    
    try:
        TargetDBService.delete_target_db(db_id, None if is_admin else current_user_id)
        return jsonify({"message": "Target database deleted successfully"}), 204
    except NotFoundError as e:
        raise NotFoundError(e.message)
    except Exception as e:
        logger.exception("Error deleting target database.")
        raise BadRequestError(f"Failed to delete target database: {str(e)}")


# Define OpenAPI Schema for TargetDatabase
"""
components:
  schemas:
    TargetDatabase:
      type: object
      properties:
        id:
          type: integer
          readOnly: true
        name:
          type: string
        db_type:
          type: string
          enum: [postgresql, mysql, mssql, oracle]
        connection_string:
          type: string
          writeOnly: true
          description: Full connection string (e.g., postgresql://user:pass@host:port/dbname)
        is_active:
          type: boolean
        owner_id:
          type: integer
          readOnly: true
        created_at:
          type: string
          format: date-time
          readOnly: true
        updated_at:
          type: string
          format: date-time
          readOnly: true
      required:
        - name
        - db_type
        - connection_string
"""
```