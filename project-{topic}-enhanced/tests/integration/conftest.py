```python
import pytest
import asyncio
from typing import AsyncGenerator

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.db.session import get_db
from app.core.config import settings
from app.crud.crud_user import crud_user
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.core.security import create_access_token, create_refresh_token
from app.db.init_db import init_db

# Reuse the session-scoped db_session and client from the main conftest
# and add data setup and specific user fixtures here

@pytest.fixture(scope="function")
async def seed_data(db_session: AsyncSession):
    """
    Fixture to seed the database with a superuser and some basic data
    for each test function that requires it.
    """
    await init_db(db_session)
    yield

@pytest.fixture(scope="function")
async def test_user(db_session: AsyncSession, seed_data) -> AsyncGenerator[tuple, None]:
    """
    Fixture to create a regular test user for API interactions.
    Returns (user_object, access_token).
    """
    user_email = "testuser@example.com"
    user_password = "testpassword"
    user_in = UserCreate(email=user_email, password=user_password, full_name="Test User")
    
    user = await crud_user.get_by_email(db_session, email=user_email)
    if not user:
        user = await crud_user.create(db_session, obj_in=user_in)
    
    access_token = create_access_token(data={"user_id": user.id})
    yield user, access_token
    # No explicit cleanup needed as db_session rolls back

@pytest.fixture(scope="function")
async def superuser(db_session: AsyncSession, seed_data) -> AsyncGenerator[tuple, None]:
    """
    Fixture to get the superuser created during seeding.
    Returns (superuser_object, access_token).
    """
    superuser_email = settings.POSTGRES_USER
    superuser = await crud_user.get_by_email(db_session, email=superuser_email)
    
    if not superuser: # Should ideally not happen after seed_data, but as a fallback
        superuser_in = UserCreate(
            email=superuser_email,
            password=settings.POSTGRES_PASSWORD,
            full_name="Admin User",
            is_superuser=True,
            is_active=True,
        )
        superuser = await crud_user.create(db_session, obj_in=superuser_in)

    access_token = create_access_token(data={"user_id": superuser.id})
    yield superuser, access_token

```