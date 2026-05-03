from app.core.database import get_db
from app.auth.security import get_current_active_user, get_current_active_admin, get_current_active_manager, get_current_active_member
from app.schemas.user import User as DBUser # Import the DB User schema
from typing import Generator
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

# This file groups common dependencies for easy import and readability.

# Re-export get_db for direct use in endpoints
def get_async_db_session() -> Generator[AsyncSession, None, None]:
    """Dependency for providing an async database session."""
    return get_db()

# Re-export current user dependencies
def get_current_user_dependency(current_user: DBUser = Depends(get_current_active_user)) -> DBUser:
    """Dependency for getting the current active user."""
    return current_user

def get_current_admin_dependency(current_user: DBUser = Depends(get_current_active_admin)) -> DBUser:
    """Dependency for getting the current active admin user."""
    return current_user

def get_current_manager_dependency(current_user: DBUser = Depends(get_current_active_manager)) -> DBUser:
    """Dependency for getting the current active manager or admin user."""
    return current_user

def get_current_member_dependency(current_user: DBUser = Depends(get_current_active_member)) -> DBUser:
    """Dependency for getting the current active member or higher user."""
    return current_user
```