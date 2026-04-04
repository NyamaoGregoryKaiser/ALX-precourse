import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate, UserUpdate
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

@pytest.mark.asyncio
async def test_read_users_superuser(client: AsyncClient, superuser_token_headers, db_session: AsyncSession):
    """Test retrieving all users as a superuser."""
    headers, superuser = superuser_token_headers
    
    # Create a regular user to ensure there's more than just the superuser
    user_in = UserCreate(username="normaluser", email="normal@example.com", password="password123")
    await crud_user.create(db_session, obj_in=user_in)

    r = await client.get(f"{settings.API_V1_STR}/users/", headers=headers)
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    assert len(users) >= 2 # Superuser and the normal user
    assert any(u["email"] == superuser.email for u in users)
    assert any(u["email"] == "normal@example.com" for u in users)


@pytest.mark.asyncio
async def test_read_users_regular_user(client: AsyncClient, regular_user_token_headers):
    """Test regular user cannot retrieve all users."""
    headers, _ = regular_user_token_headers
    r = await client.get(f"{settings.API_V1_STR}/users/", headers=headers)
    assert r.status_code == 400
    assert "doesn't have enough privileges" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_read_user_me(client: AsyncClient, regular_user_token_headers):
    """Test retrieving current authenticated user's profile."""
    headers, user = regular_user_token_headers
    r = await client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert r.status_code == 200
    current_user = r.json()
    assert current_user["email"] == user.email
    assert current_user["username"] == user.username
    assert current_user["id"] == str(user.id)

@pytest.mark.asyncio
async def test_update_user_me(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test updating current authenticated user's profile."""
    headers, user = regular_user_token_headers
    update_data = {"username": "updateduser", "email": "updated@example.com"}
    r = await client.put(f"{settings.API_V1_STR}/users/me", headers=headers, json=update_data)
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["username"] == update_data["username"]
    assert updated_user["email"] == update_data["email"]

    # Verify update in DB
    db_user = await crud_user.get(db_session, id=user.id)
    assert db_user.username == update_data["username"]
    assert db_user.email == update_data["email"]

@pytest.mark.asyncio
async def test_update_user_me_password(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test updating current authenticated user's password."""
    headers, user = regular_user_token_headers
    new_password = "newsecurepassword"
    update_data = {"password": new_password}
    r = await client.put(f"{settings.API_V1_STR}/users/me", headers=headers, json=update_data)
    assert r.status_code == 200
    
    # Verify password change by logging in with new password
    login_data = {
        "username": user.email,
        "password": new_password,
    }
    r_login = await client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert r_login.status_code == 200
    assert "access_token" in r_login.json()

@pytest.mark.asyncio
async def test_update_user_me_duplicate_email(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test updating user's email to an already existing one."""
    headers, user = regular_user_token_headers
    
    # Create another user
    another_user_in = UserCreate(username="another", email="another@example.com", password="password")
    await crud_user.create(db_session, obj_in=another_user_in)

    update_data = {"email": "another@example.com"}
    r = await client.put(f"{settings.API_V1_STR}/users/me", headers=headers, json=update_data)
    assert r.status_code == 400
    assert "email already registered" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_read_user_by_id_superuser(client: AsyncClient, superuser_token_headers, db_session: AsyncSession):
    """Test superuser can retrieve any user by ID."""
    headers, _ = superuser_token_headers
    
    user_in = UserCreate(username="target", email="target@example.com", password="password")
    target_user = await crud_user.create(db_session, obj_in=user_in)

    r = await client.get(f"{settings.API_V1_STR}/users/{target_user.id}", headers=headers)
    assert r.status_code == 200
    retrieved_user = r.json()
    assert retrieved_user["id"] == str(target_user.id)
    assert retrieved_user["email"] == target_user.email

@pytest.mark.asyncio
async def test_read_user_by_id_regular_user(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test regular user cannot retrieve other users by ID."""
    headers, _ = regular_user_token_headers
    
    user_in = UserCreate(username="target", email="target@example.com", password="password")
    target_user = await crud_user.create(db_session, obj_in=user_in)

    r = await client.get(f"{settings.API_V1_STR}/users/{target_user.id}", headers=headers)
    assert r.status_code == 400
    assert "doesn't have enough privileges" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_update_user_by_id_superuser(client: AsyncClient, superuser_token_headers, db_session: AsyncSession):
    """Test superuser can update any user by ID."""
    headers, _ = superuser_token_headers
    
    user_in = UserCreate(username="update_target", email="update_target@example.com", password="password")
    target_user = await crud_user.create(db_session, obj_in=user_in)

    update_data = {"username": "updated_by_admin", "is_active": False}
    r = await client.put(f"{settings.API_V1_STR}/users/{target_user.id}", headers=headers, json=update_data)
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["username"] == update_data["username"]
    assert updated_user["is_active"] is False

    db_user = await crud_user.get(db_session, id=target_user.id)
    assert db_user.username == update_data["username"]
    assert db_user.is_active is False

@pytest.mark.asyncio
async def test_update_user_by_id_regular_user(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test regular user cannot update other users by ID."""
    headers, _ = regular_user_token_headers
    
    user_in = UserCreate(username="update_target_reg", email="update_target_reg@example.com", password="password")
    target_user = await crud_user.create(db_session, obj_in=user_in)

    update_data = {"username": "attempted_update"}
    r = await client.put(f"{settings.API_V1_STR}/users/{target_user.id}", headers=headers, json=update_data)
    assert r.status_code == 400
    assert "doesn't have enough privileges" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_delete_user_superuser(client: AsyncClient, superuser_token_headers, db_session: AsyncSession):
    """Test superuser can delete other users."""
    headers, _ = superuser_token_headers
    
    user_in = UserCreate(username="delete_target", email="delete_target@example.com", password="password")
    target_user = await crud_user.create(db_session, obj_in=user_in)

    r = await client.delete(f"{settings.API_V1_STR}/users/{target_user.id}", headers=headers)
    assert r.status_code == 200
    deleted_user = r.json()
    assert deleted_user["id"] == str(target_user.id)

    db_user = await crud_user.get(db_session, id=target_user.id)
    assert db_user is None

@pytest.mark.asyncio
async def test_delete_own_user_superuser_forbidden(client: AsyncClient, superuser_token_headers, db_session: AsyncSession):
    """Test superuser cannot delete their own account via /users/{user_id}."""
    headers, superuser = superuser_token_headers
    
    r = await client.delete(f"{settings.API_V1_STR}/users/{superuser.id}", headers=headers)
    assert r.status_code == 400
    assert "cannot delete your own user account" in r.json()["detail"].lower()

@pytest.mark.asyncio
async def test_delete_user_regular_user(client: AsyncClient, regular_user_token_headers, db_session: AsyncSession):
    """Test regular user cannot delete other users."""
    headers, _ = regular_user_token_headers
    
    user_in = UserCreate(username="delete_target_reg_unauth", email="delete_target_reg_unauth@example.com", password="password")
    target_user = await crud_user.create(db_session, obj_in=user_in)

    r = await client.delete(f"{settings.API_V1_STR}/users/{target_user.id}", headers=headers)
    assert r.status_code == 400
    assert "doesn't have enough privileges" in r.json()["detail"].lower()
```