```python
import pytest
from httpx import AsyncClient
import uuid

from app.core.config import settings
from app.db.models.item import Item
from app.db.models.user import User
from app.schemas.item import ItemRead

@pytest.mark.asyncio
async def test_create_item(client: AsyncClient, test_user_token: str):
    response = await client.post(
        f"{settings.API_V1_STR}/items/",
        json={
            "name": "New Awesome Item",
            "description": "This is a brand new item.",
            "price": 29.99
        },
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 201
    item_data = response.json()
    assert "id" in item_data
    assert item_data["name"] == "New Awesome Item"
    assert item_data["price"] == 29.99
    assert item_data["is_available"] is True
    assert "owner_id" in item_data

@pytest.mark.asyncio
async def test_create_item_unauthorized(client: AsyncClient):
    response = await client.post(
        f"{settings.API_V1_STR}/items/",
        json={
            "name": "Unauthorized Item",
            "description": "Description",
            "price": 10.0
        }
        # No Authorization header
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated."

@pytest.mark.asyncio
async def test_get_all_items(client: AsyncClient, test_item: Item, test_user_token: str):
    response = await client.get(
        f"{settings.API_V1_STR}/items/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    items_data = response.json()
    assert isinstance(items_data, list)
    assert any(item["id"] == str(test_item.id) for item in items_data)

@pytest.mark.asyncio
async def test_get_item_by_id(client: AsyncClient, test_item: Item, test_user_token: str):
    response = await client.get(
        f"{settings.API_V1_STR}/items/{test_item.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    item_data = ItemRead(**response.json())
    assert item_data.id == test_item.id
    assert item_data.name == test_item.name

@pytest.mark.asyncio
async def test_get_item_by_id_not_found(client: AsyncClient, test_user_token: str):
    non_existent_uuid = uuid.uuid4()
    response = await client.get(
        f"{settings.API_V1_STR}/items/{non_existent_uuid}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == f"Item with ID {non_existent_uuid} not found."

@pytest.mark.asyncio
async def test_update_item(client: AsyncClient, test_item: Item, test_user_token: str):
    updated_name = "Super Updated Item"
    updated_price = 35.50
    response = await client.put(
        f"{settings.API_V1_STR}/items/{test_item.id}",
        json={"name": updated_name, "price": updated_price, "description": "New description"},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    item_data = ItemRead(**response.json())
    assert item_data.id == test_item.id
    assert item_data.name == updated_name
    assert item_data.price == updated_price
    assert item_data.description == "New description"

@pytest.mark.asyncio
async def test_update_item_not_owner_forbidden(client: AsyncClient, test_item: Item, admin_user_token: str):
    # Admin tries to update an item owned by test_user
    response = await client.put(
        f"{settings.API_V1_STR}/items/{test_item.id}",
        json={"name": "Forbidden Update"},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to modify this item."

@pytest.mark.asyncio
async def test_delete_item(client: AsyncClient, test_item: Item, test_user_token: str):
    response = await client.delete(
        f"{settings.API_V1_STR}/items/{test_item.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 204
    
    # Verify deletion
    fetch_response = await client.get(
        f"{settings.API_V1_STR}/items/{test_item.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert fetch_response.status_code == 404

@pytest.mark.asyncio
async def test_delete_item_not_owner_forbidden(client: AsyncClient, test_item: Item, admin_user_token: str):
    response = await client.delete(
        f"{settings.API_V1_STR}/items/{test_item.id}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this item."

```