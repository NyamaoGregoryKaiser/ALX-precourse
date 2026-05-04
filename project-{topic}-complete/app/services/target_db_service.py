```python
# app/services/target_db_service.py
from app.models.target_db_model import TargetDatabase
from app.core.db import db
from app.utils.errors import NotFoundError, ConflictError
from app.utils.logger import logger

class TargetDBService:
    @staticmethod
    def create_target_db(name, db_type, connection_string, owner_id):
        """Registers a new target database."""
        if TargetDatabase.query.filter_by(name=name, owner_id=owner_id).first():
            raise ConflictError(f"Target database with name '{name}' already exists for this owner.")
        
        target_db = TargetDatabase(
            name=name,
            db_type=db_type,
            connection_string=connection_string,
            owner_id=owner_id
        )
        target_db.save()
        logger.info(f"Target database '{name}' created by user {owner_id}.")
        return target_db

    @staticmethod
    def get_all_target_dbs(owner_id=None):
        """Retrieves all target databases, optionally filtered by owner."""
        if owner_id:
            return TargetDatabase.query.filter_by(owner_id=owner_id).all()
        return TargetDatabase.get_all()

    @staticmethod
    def get_target_db_by_id(db_id, owner_id=None):
        """Retrieves a target database by ID, with optional owner validation."""
        query = TargetDatabase.query.filter_by(id=db_id)
        if owner_id:
            query = query.filter_by(owner_id=owner_id)
        
        target_db = query.first()
        if not target_db:
            if owner_id:
                raise NotFoundError(f"Target database with id {db_id} not found for this user.")
            raise NotFoundError(f"Target database with id {db_id} not found.")
        return target_db

    @staticmethod
    def update_target_db(db_id, data, owner_id=None):
        """Updates an existing target database."""
        target_db = TargetDBService.get_target_db_by_id(db_id, owner_id)
        
        if 'name' in data and data['name'] != target_db.name:
            if TargetDatabase.query.filter_by(name=data['name'], owner_id=target_db.owner_id).filter(TargetDatabase.id != db_id).first():
                raise ConflictError(f"Target database with name '{data['name']}' already exists for this owner.")
            target_db.name = data['name']
        
        if 'db_type' in data:
            target_db.db_type = data['db_type']
        
        if 'connection_string' in data:
            target_db.connection_string = data['connection_string']
            
        if 'is_active' in data:
            target_db.is_active = data['is_active']

        target_db.save()
        logger.info(f"Target database '{target_db.name}' ({db_id}) updated by user {owner_id}.")
        return target_db

    @staticmethod
    def delete_target_db(db_id, owner_id=None):
        """Deletes a target database."""
        target_db = TargetDBService.get_target_db_by_id(db_id, owner_id)
        target_db.delete()
        logger.info(f"Target database '{target_db.name}' ({db_id}) deleted by user {owner_id}.")
        return True
```