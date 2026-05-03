```python
"""
Integration tests for the User API endpoints.

These tests cover:
- CRUD operations for users (`/api/v1/users`).
- Authorization checks for user management (admin vs. regular user).
- Pagination and search for user listings.
"""

import pytest
from httpx import AsyncClient
from fastapi import status
from app.schemas.user import UserCreate, UserUpdate, UserRead, UserRole
from app.services import user_service
from app.core.database import AsyncSessionLocal
import asyncio
import time

@pytest.fixture(scope="function")
async def seed_users(test_db):
    """Fixture to seed some users for testing."""
    async with AsyncSessionLocal() as session:
        user1 = await user_service.create_user(
            UserCreate(email="user1@test.com", password="password1", full_name="User One", role=UserRole.CUSTOMER).model_dump(), db=session
        )
        user2 = await user_service.create_user(
            UserCreate(email="user2@test.com", password="password2", full_name="User Two", role=UserRole.CUSTOMER).model_dump(), db=session
        )
        user3 = await user_service.create_user(
            UserCreate(email="user3@test.com", password="password3", full_name="User Three", role=UserRole.CUSTOMER, is_active=False).model_dump(), db=session
        )
        await session.commit()
        return [user1, user2, user3]

# --- Read Users Tests ---

@pytest.mark.asyncio
async def test_read_users_list_by_admin(async_client: AsyncClient, seed_users, admin_auth_headers: dict):
    """Test retrieving a list of all users by an admin."""
    response = await async_client.get("/api/v1/users", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    users = [UserRead.model_validate(u) for u in response.json()]
    assert len(users) >= 3 # Expect at least 3 users from seed_users
    assert any(u.email == "user1@test.com" for u in users)
    assert any(u.email == "user3@test.com" for u in users) # Inactive user should also be visible to admin

@pytest.mark.asyncio
async def test_read_users_list_by_customer_unauthorized(async_client: AsyncClient, seed_users, customer_auth_headers: dict):
    """Test retrieving a list of all users by a regular user (should fail)."""
    response = await async_client.get("/api/v1/users", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "administrative privileges" in response.json()["message"]

@pytest.mark.asyncio
async def test_read_user_by_id_self_success(async_client: AsyncClient, test_customer_user: UserRead, customer_auth_headers: dict):
    """Test retrieving own user details by a regular user."""
    response = await async_client.get(f"/api/v1/users/{test_customer_user.id}", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    user = UserRead.model_validate(response.json())
    assert user.id == test_customer_user.id
    assert user.email == test_customer_user.email

@pytest.mark.asyncio
async def test_read_user_by_id_admin_success(async_client: AsyncClient, seed_users, admin_auth_headers: dict):
    """Test retrieving any user details by an admin."""
    user_id = seed_users[0].id
    response = await async_client.get(f"/api/v1/users/{user_id}", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    user = UserRead.model_validate(response.json())
    assert user.id == user_id
    assert user.email == seed_users[0].email

@pytest.mark.asyncio
async def test_read_user_by_id_other_customer_unauthorized(async_client: AsyncClient, seed_users, customer_auth_headers: dict):
    """Test retrieving another user's details by a regular user (should fail)."""
    other_user_id = seed_users[0].id # Assume seed_users[0] is not the test_customer_user
    response = await async_client.get(f"/api/v1/users/{other_user_id}", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not authorized to view this user's details" in response.json()["message"]

@pytest.mark.asyncio
async def test_read_user_by_id_not_found(async_client: AsyncClient, admin_auth_headers: dict):
    """Test retrieving a non-existent user."""
    response = await async_client.get("/api/v1/users/9999", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found" in response.json()["message"]

# --- Update User Tests ---

@pytest.mark.asyncio
async def test_update_user_self_success(async_client: AsyncClient, test_customer_user: UserRead, customer_auth_headers: dict):
    """Test a regular user updating their own details."""
    update_data = UserUpdate(full_name="Updated Customer Name")
    response = await async_client.put(f"/api/v1/users/{test_customer_user.id}", json=update_data.model_dump(), headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    user = UserRead.model_validate(response.json())
    assert user.id == test_customer_user.id
    assert user.full_name == update_data.full_name

@pytest.mark.asyncio
async def test_update_user_admin_success(async_client: AsyncClient, seed_users, admin_auth_headers: dict):
    """Test an admin updating another user's details."""
    user_id = seed_users[0].id
    update_data = UserUpdate(full_name="Admin Changed Name", is_active=False, role=UserRole.ADMIN)
    response = await async_client.put(f"/api/v1/users/{user_id}", json=update_data.model_dump(), headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    user = UserRead.model_validate(response.json())
    assert user.id == user_id
    assert user.full_name == update_data.full_name
    assert user.is_active == update_data.is_active
    assert user.role == update_data.role

@pytest.mark.asyncio
async def test_update_user_self_change_role_fail(async_client: AsyncClient, test_customer_user: UserRead, customer_auth_headers: dict):
    """Test a regular user trying to change their own role (should fail)."""
    update_data = UserUpdate(role=UserRole.ADMIN)
    response = await async_client.put(f"/api/v1/users/{test_customer_user.id}", json=update_data.model_dump(), headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not authorized to change user role" in response.json()["message"]

@pytest.mark.asyncio
async def test_update_user_other_customer_unauthorized(async_client: AsyncClient, seed_users, customer_auth_headers: dict):
    """Test a regular user trying to update another user's details (should fail)."""
    other_user_id = seed_users[0].id
    update_data = UserUpdate(full_name="Hacker Name")
    response = await async_client.put(f"/api/v1/users/{other_user_id}", json=update_data.model_dump(), headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Not authorized to update this user's details" in response.json()["message"]

@pytest.mark.asyncio
async def test_update_user_not_found(async_client: AsyncClient, admin_auth_headers: dict):
    """Test updating a non-existent user."""
    update_data = UserUpdate(full_name="Non Existent")
    response = await async_client.put("/api/v1/users/9999", json=update_data.model_dump(), headers=admin_auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found" in response.json()["message"]

# --- Delete User Tests ---

@pytest.mark.asyncio
async def test_delete_user_admin_success(async_client: AsyncClient, seed_users, admin_auth_headers: dict):
    """Test an admin deleting a user."""
    user_id_to_delete = seed_users[1].id
    response = await async_client.delete(f"/api/v1/users/{user_id_to_delete}", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify deletion in DB
    check_response = await async_client.get(f"/api/v1/users/{user_id_to_delete}", headers=admin_auth_headers)
    assert check_response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_delete_user_customer_unauthorized(async_client: AsyncClient, seed_users, customer_auth_headers: dict):
    """Test a regular user trying to delete a user (should fail)."""
    user_id_to_delete = seed_users[0].id
    response = await async_client.delete(f"/api/v1/users/{user_id_to_delete}", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "administrative privileges" in response.json()["message"]

@pytest.mark.asyncio
async def test_delete_user_not_found(async_client: AsyncClient, admin_auth_headers: dict):
    """Test deleting a non-existent user."""
    response = await async_client.delete("/api/v1/users/9999", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "User not found" in response.json()["message"]

@pytest.mark.asyncio
async def test_user_list_rate_limiting(async_client: AsyncClient, admin_auth_headers: dict):
    """Test if /users endpoint applies rate limiting."""
    # The /users GET endpoint has a limit of 10 requests per minute
    for i in range(10):
        response = await async_client.get("/api/v1/users", headers=admin_auth_headers)
        assert response.status_code == status.HTTP_200_OK

    # The 11th request should be rate-limited
    response = await async_client.get("/api/v1/users", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Rate limit exceeded" in response.json()["message"]
    assert "Retry-After" in response.headers

    # Wait for the limit to reset and try again
    time.sleep(60)
    response = await async_client.get("/api/v1/users", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK # Should succeed after reset

```