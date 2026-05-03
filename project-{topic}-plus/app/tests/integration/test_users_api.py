import pytest
from httpx import AsyncClient
from app.schemas.user import UserRole
from app.models.user import UserCreate, UserUpdate
from app.core.security import verify_password
from app.crud import users as crud_users
from faker import Faker

fake = Faker()

@pytest.mark.asyncio
async def test_create_user_as_admin(client: AsyncClient, admin_auth_headers: dict):
    user_data = {
        "username": fake.user_name(),
        "email": fake.email(),
        "password": fake.password(),
        "full_name": fake.name(),
        "role": UserRole.MEMBER.value
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=admin_auth_headers)
    assert response.status_code == 201
    created_user = response.json()
    assert created_user["username"] == user_data["username"]
    assert created_user["email"] == user_data["email"]
    assert created_user["role"] == UserRole.MEMBER.value
    assert "hashed_password" not in created_user # Should not expose hashed password

@pytest.mark.asyncio
async def test_create_user_as_member_forbidden(client: AsyncClient, member_auth_headers: dict):
    user_data = {
        "username": fake.user_name(),
        "email": fake.email(),
        "password": fake.password(),
        "full_name": fake.name(),
        "role": UserRole.MANAGER.value
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient, admin_auth_headers: dict, create_test_user):
    existing_user = await create_test_user()
    user_data = {
        "username": fake.user_name(),
        "email": existing_user.email, # Duplicate email
        "password": fake.password(),
        "full_name": fake.name()
    }
    response = await client.post("/api/v1/users/", json=user_data, headers=admin_auth_headers)
    assert response.status_code == 409 # Conflict
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_users_as_admin(client: AsyncClient, admin_auth_headers: dict, create_test_user):
    await create_test_user(username=fake.user_name(), email=fake.email())
    response = await client.get("/api/v1/users/", headers=admin_auth_headers)
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1 # At least the user created by the fixture

@pytest.mark.asyncio
async def test_read_users_as_member_forbidden(client: AsyncClient, member_auth_headers: dict):
    response = await client.get("/api/v1/users/", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_read_user_me(client: AsyncClient, member_user, member_auth_headers: dict):
    response = await client.get("/api/v1/users/me", headers=member_auth_headers)
    assert response.status_code == 200
    user_me = response.json()
    assert user_me["id"] == member_user.id
    assert user_me["email"] == member_user.email

@pytest.mark.asyncio
async def test_update_user_me(client: AsyncClient, member_user, member_auth_headers: dict):
    new_full_name = "Updated Test Member"
    new_email = fake.email()
    update_data = {"full_name": new_full_name, "email": new_email}
    response = await client.put("/api/v1/users/me", json=update_data, headers=member_auth_headers)
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["full_name"] == new_full_name
    assert updated_user["email"] == new_email
    assert updated_user["id"] == member_user.id

@pytest.mark.asyncio
async def test_update_user_me_cannot_change_role(client: AsyncClient, member_user, member_auth_headers: dict):
    update_data = {"role": UserRole.ADMIN.value}
    response = await client.put("/api/v1/users/me", json=update_data, headers=member_auth_headers)
    assert response.status_code == 200 # FastAPI will ignore the field due to `exclude_unset`
    updated_user = response.json()
    assert updated_user["role"] == UserRole.MEMBER.value # Role should remain unchanged

@pytest.mark.asyncio
async def test_read_user_by_id_as_admin(client: AsyncClient, admin_auth_headers: dict, member_user):
    response = await client.get(f"/api/v1/users/{member_user.id}", headers=admin_auth_headers)
    assert response.status_code == 200
    user = response.json()
    assert user["id"] == member_user.id
    assert user["email"] == member_user.email

@pytest.mark.asyncio
async def test_read_user_by_id_as_member_forbidden(client: AsyncClient, member_auth_headers: dict, admin_user):
    response = await client.get(f"/api/v1/users/{admin_user.id}", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_update_user_by_id_as_admin(client: AsyncClient, admin_auth_headers: dict, member_user):
    new_username = fake.user_name()
    update_data = {"username": new_username, "is_active": False, "role": UserRole.MANAGER.value}
    response = await client.put(f"/api/v1/users/{member_user.id}", json=update_data, headers=admin_auth_headers)
    assert response.status_code == 200
    updated_user = response.json()
    assert updated_user["username"] == new_username
    assert updated_user["is_active"] is False
    assert updated_user["role"] == UserRole.MANAGER.value

@pytest.mark.asyncio
async def test_update_user_by_id_as_member_forbidden(client: AsyncClient, member_auth_headers: dict, admin_user):
    update_data = {"full_name": "Should not update"}
    response = await client.put(f"/api/v1/users/{admin_user.id}", json=update_data, headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden

@pytest.mark.asyncio
async def test_delete_user_as_admin(client: AsyncClient, admin_auth_headers: dict, create_test_user):
    user_to_delete = await create_test_user(username="temp_user_del", email="temp_user_del@example.com")
    response = await client.delete(f"/api/v1/users/{user_to_delete.id}", headers=admin_auth_headers)
    assert response.status_code == 204 # No Content

    response = await client.get(f"/api/v1/users/{user_to_delete.id}", headers=admin_auth_headers)
    assert response.status_code == 404 # Not Found

@pytest.mark.asyncio
async def test_delete_own_user_as_admin_forbidden(client: AsyncClient, admin_user, admin_auth_headers: dict):
    response = await client.delete(f"/api/v1/users/{admin_user.id}", headers=admin_auth_headers)
    assert response.status_code == 400 # Bad Request
    assert "You cannot delete your own account" in response.json()["detail"]

@pytest.mark.asyncio
async def test_delete_user_as_member_forbidden(client: AsyncClient, member_auth_headers: dict, admin_user):
    response = await client.delete(f"/api/v1/users/{admin_user.id}", headers=member_auth_headers)
    assert response.status_code == 403 # Forbidden
```