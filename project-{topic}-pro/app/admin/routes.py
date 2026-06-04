```python
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.auth.decorators import admin_required
from app.extensions import limiter, db
from app.models import User, Post, Category, Tag
from sqlalchemy import text # For raw SQL operations if needed

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard_stats', methods=['GET'])
@jwt_required()
@admin_required()
@limiter.limit("20 per minute", error_message="Too many requests for admin stats.")
def dashboard_stats():
    """
    Retrieves key statistics for the admin dashboard. Requires admin role.
    ---
    get:
      summary: Get admin dashboard statistics
      security:
        - access_token: []
      responses:
        200:
          description: Admin dashboard statistics
          content:
            application/json:
              schema:
                type: object
                properties:
                  total_users:
                    type: integer
                  active_users:
                    type: integer
                  total_posts:
                    type: integer
                  published_posts:
                    type: integer
                  draft_posts:
                    type: integer
                  total_categories:
                    type: integer
                  total_tags:
                    type: integer
                  # Add more stats as needed, e.g., total comments, media items, etc.
        401:
          description: Unauthorized
        403:
          description: Forbidden (not an admin)
        429:
          description: Too many requests
    """
    try:
        total_users = db.session.query(User).count()
        active_users = db.session.query(User).filter_by(is_active=True).count()
        total_posts = db.session.query(Post).count()
        published_posts = db.session.query(Post).filter_by(status='published').count()
        draft_posts = db.session.query(Post).filter_by(status='draft').count()
        total_categories = db.session.query(Category).count()
        total_tags = db.session.query(Tag).count()

        stats = {
            "total_users": total_users,
            "active_users": active_users,
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts,
            "total_categories": total_categories,
            "total_tags": total_tags
        }
        current_app.logger.info(f"Admin dashboard stats retrieved by user {get_jwt_identity()}.")
        return jsonify(stats), 200
    except Exception as e:
        current_app.logger.exception("Error retrieving admin dashboard statistics.")
        return jsonify({"message": "Could not retrieve stats due to an internal server error."}), 500

@admin_bp.route('/manage_user_status/<uuid:user_id>', methods=['PUT'])
@jwt_required()
@admin_required()
@limiter.limit("10 per hour", error_message="Too many user status update attempts.")
def manage_user_status(user_id):
    """
    Activates or deactivates a user account. Requires admin role.
    ---
    put:
      summary: Activate or deactivate a user account
      security:
        - access_token: []
      parameters:
        - in: path
          name: user_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the user to manage
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                is_active:
                  type: boolean
                  description: Set to true to activate, false to deactivate
              required:
                - is_active
      responses:
        200:
          description: User status updated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: User status updated to active
                  user_id:
                    type: string
                  is_active:
                    type: boolean
        400:
          description: Invalid input
        401:
          description: Unauthorized
        403:
          description: Forbidden (not an admin or cannot deactivate own account)
        404:
          description: User not found
        429:
          description: Too many requests
    """
    data = request.get_json()
    is_active = data.get('is_active')

    if not isinstance(is_active, bool):
        return jsonify({"message": "Invalid 'is_active' value. Must be a boolean."}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404

    current_admin_id = get_jwt_identity()
    if str(user.id) == current_admin_id and not is_active:
        return jsonify({"message": "An administrator cannot deactivate their own account."}), 403

    try:
        user.is_active = is_active
        db.session.commit()
        status_text = "active" if is_active else "inactive"
        current_app.logger.info(f"User {user.username} (ID: {user_id}) status changed to {status_text} by admin {current_admin_id}.")
        return jsonify({"message": f"User status updated to {status_text}", "user_id": user_id, "is_active": is_active}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(f"Error updating user status for user {user_id} by admin {current_admin_id}: {e}")
        return jsonify({"message": "Could not update user status due to an internal server error."}), 500

# Example of a more powerful admin action (e.g., global content moderation)
@admin_bp.route('/moderate_comment/<uuid:comment_id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'editor'])
@limiter.limit("15 per hour")
def moderate_comment(comment_id):
    """
    Moderates a comment (e.g., sets status to 'approved' or 'spam').
    Requires admin or editor role.
    ---
    put:
      summary: Moderate a comment
      security:
        - access_token: []
      parameters:
        - in: path
          name: comment_id
          schema:
            type: string
            format: uuid
          required: true
          description: UUID of the comment to moderate
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  enum: [pending, approved, spam]
                  description: New status for the comment
              required:
                - status
      responses:
        200:
          description: Comment status updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Comment status updated to approved
                  comment_id:
                    type: string
                  status:
                    type: string
        400:
          description: Invalid input
        401:
          description: Unauthorized
        403:
          description: Forbidden (insufficient role)
        404:
          description: Comment not found
        429:
          description: Too many requests
    """
    from app.models import Comment
    data = request.get_json()
    new_status = data.get('status')

    if new_status not in ['pending', 'approved', 'spam']:
        return jsonify({"message": "Invalid status provided. Must be 'pending', 'approved', or 'spam'."}), 400

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({"message": "Comment not found."}), 404

    try:
        comment.status = new_status
        db.session.commit()
        current_app.logger.info(f"Comment {comment_id} status changed to {new_status} by user {get_jwt_identity()}.")
        return jsonify({"message": f"Comment status updated to {new_status}", "comment_id": comment_id, "status": new_status}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(f"Error moderating comment {comment_id} by user {get_jwt_identity()}: {e}")
        return jsonify({"message": "Could not moderate comment due to an internal server error."}), 500
```