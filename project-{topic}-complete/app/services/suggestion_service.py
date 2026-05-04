```python
# app/services/suggestion_service.py
from app.models.optimization_suggestion_model import OptimizationSuggestion
from app.core.db import db
from app.utils.errors import NotFoundError
from app.utils.logger import logger

class SuggestionService:
    @staticmethod
    def create_suggestion(target_db_id, suggestion_type, description, sql_statement=None, priority='medium', suggested_by_user_id=None, metric_id=None):
        """Creates a new optimization suggestion."""
        suggestion = OptimizationSuggestion(
            target_db_id=target_db_id,
            metric_id=metric_id,
            suggestion_type=suggestion_type,
            description=description,
            sql_statement=sql_statement,
            priority=priority,
            suggested_by_user_id=suggested_by_user_id
        )
        suggestion.save()
        logger.info(f"Suggestion '{suggestion_type}' created for DB {target_db_id}.")
        return suggestion

    @staticmethod
    def get_all_suggestions(target_db_id=None, status=None, priority=None):
        """Retrieves all suggestions, with optional filters."""
        query = OptimizationSuggestion.query
        if target_db_id:
            query = query.filter_by(target_db_id=target_db_id)
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        return query.order_by(OptimizationSuggestion.created_at.desc()).all()

    @staticmethod
    def get_suggestion_by_id(suggestion_id):
        """Retrieves a single suggestion by ID."""
        suggestion = OptimizationSuggestion.get_by_id(suggestion_id)
        if not suggestion:
            raise NotFoundError(f"Optimization suggestion with id {suggestion_id} not found.")
        return suggestion

    @staticmethod
    def update_suggestion(suggestion_id, data):
        """Updates an existing suggestion's information."""
        suggestion = SuggestionService.get_suggestion_by_id(suggestion_id)
        
        if 'description' in data:
            suggestion.description = data['description']
        if 'sql_statement' in data:
            suggestion.sql_statement = data['sql_statement']
        if 'priority' in data:
            suggestion.priority = data['priority']
        if 'status' in data:
            suggestion.status = data['status']

        suggestion.save()
        logger.info(f"Suggestion {suggestion_id} updated to status '{suggestion.status}'.")
        return suggestion

    @staticmethod
    def delete_suggestion(suggestion_id):
        """Deletes an optimization suggestion."""
        suggestion = SuggestionService.get_suggestion_by_id(suggestion_id)
        suggestion.delete()
        logger.info(f"Suggestion {suggestion_id} deleted.")
        return True
```