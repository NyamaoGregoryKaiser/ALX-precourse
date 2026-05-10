import pytest
from httpx import AsyncClient
from fastapi import status
from app.core.config import settings
from app.crud.service import crud_service
from app.schemas.service import ServiceCreate

@pytest.mark.asyncio
async def test_create_service_as_admin(client: AsyncClient, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    service_data = {"name": "Admin Service", "description": "Managed by admin"}
    response = await client.post(f"{settings.API_V1_STR}/services/", json=service_data, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    created_service = response.json()
    assert created_service["name"] == service_data["name"]
    assert created_service["is_active"] is True

@pytest.mark.asyncio
async def test_create_service_as_normal_user_forbidden(client: AsyncClient, normal_user_token):
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    service_data = {"name": "User Service", "description": "Should be forbidden"}
    response = await client.post(f"{settings.API_V1_STR}/services/", json=service_data, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_read_services(client: AsyncClient, normal_user_token, db_session):
    # Ensure some services exist
    await crud_service.create(db_session, obj_in=ServiceCreate(name="Service A"))
    await crud_service.create(db_session, obj_in=ServiceCreate(name="Service B"))

    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/services/", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    services = response.json()
    assert len(services) >= 2 # Might have others from other tests in same session, but at least these two
    assert any(s["name"] == "Service A" for s in services)

@pytest.mark.asyncio
async def test_read_single_service(client: AsyncClient, normal_user_token, db_session):
    service_created = await crud_service.create(db_session, obj_in=ServiceCreate(name="Single Service Test"))
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/services/{service_created.id}", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    service = response.json()
    assert service["name"] == "Single Service Test"
    assert service["id"] == service_created.id

@pytest.mark.asyncio
async def test_read_non_existent_service(client: AsyncClient, normal_user_token):
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.get(f"{settings.API_V1_STR}/services/99999", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Service not found"

@pytest.mark.asyncio
async def test_update_service_as_admin(client: AsyncClient, admin_token, db_session):
    service_created = await crud_service.create(db_session, obj_in=ServiceCreate(name="Updatable Service", description="Old description"))
    headers = {"Authorization": f"Bearer {admin_token}"}
    update_data = {"description": "New description for service", "is_active": False}
    response = await client.put(f"{settings.API_V1_STR}/services/{service_created.id}", json=update_data, headers=headers)
    assert response.status_code == status.HTTP_200_OK
    updated_service = response.json()
    assert updated_service["description"] == update_data["description"]
    assert updated_service["is_active"] == update_data["is_active"]

@pytest.mark.asyncio
async def test_update_service_as_normal_user_forbidden(client: AsyncClient, normal_user_token, db_session):
    service_created = await crud_service.create(db_session, obj_in=ServiceCreate(name="Forbidden Update Service"))
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    update_data = {"description": "Attempted update"}
    response = await client.put(f"{settings.API_V1_STR}/services/{service_created.id}", json=update_data, headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_delete_service_as_admin(client: AsyncClient, admin_token, db_session):
    service_created = await crud_service.create(db_session, obj_in=ServiceCreate(name="Deletable Service"))
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = await client.delete(f"{settings.API_V1_STR}/services/{service_created.id}", headers=headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify deletion
    response = await client.get(f"{settings.API_V1_STR}/services/{service_created.id}", headers=headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_delete_service_as_normal_user_forbidden(client: AsyncClient, normal_user_token, db_session):
    service_created = await crud_service.create(db_session, obj_in=ServiceCreate(name="Forbidden Delete Service"))
    headers = {"Authorization": f"Bearer {normal_user_token}"}
    response = await client.delete(f"{settings.API_V1_STR}/services/{service_created.id}", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

```

#### `tests/integration/test_api_metrics.py`
```python