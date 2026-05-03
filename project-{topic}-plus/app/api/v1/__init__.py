from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import users as crud_users
from app.core.security import verify_password
from app.auth.security import create_access_token
from app.models.token import Token
from app.dependencies.common import get_async_db_session
from loguru import logger

# Import all endpoint routers
from .endpoints import users, projects, tasks

api_router = APIRouter()

# Authentication endpoint
@api_router.post("/auth/token", response_model=Token, summary="Authenticate and get JWT access token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db_session)
):
    """
    Obtain a JWT access token by providing username and password.
    """
    logger.info(f"Attempting to authenticate user: {form_data.username}")
    user = await crud_users.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Authentication failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        logger.warning(f"Authentication failed: User {form_data.username} is inactive.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = create_access_token(data={"sub": str(user.id)})
    logger.info(f"User {user.id} authenticated successfully.")
    return {"access_token": access_token, "token_type": "bearer"}


# Include all other API endpoints
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
```