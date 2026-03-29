```python
import pytest
from httpx import AsyncClient
import uuid

from app.core.config import settings
from app.db.models.order import Order, OrderStatus
from app.db.models.user import User
from app.db.models.item import Item
from app.schemas.order import OrderRead

@pytest.mark.asyncio
async def test_create_order(client: AsyncClient, test_user_token: str, test_item: Item):
    response = await client.post(
        f"{settings.API_V1_STR}/orders/",
        json={
            "shipping_address": "123 Test Street, Test City",
            "items": [
                {"item_id": str(test_item.id), "quantity": 2}
            ]
        },
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 201
    order_data = response.json()
    assert "id" in order_data
    assert order_data["customer_id"] is not None
    assert order_data["shipping_address"] == "123 Test Street, Test City"
    assert order_data["status"] == OrderStatus.PENDING.value
    assert order_data["total_amount"] == round(test_item.price * 2, 2)
    assert len(order_data["order_items"]) == 1
    assert order_data["order_items"][0]["item_id"] == str(test_item.id)
    assert order_data["order_items"][0]["quantity"] == 2

@pytest.mark.asyncio
async def test_create_order_item_not_found(client: AsyncClient, test_user_token: str):
    non_existent_item_id = uuid.uuid4()
    response = await client.post(
        f"{settings.API_V1_STR}/orders/",
        json={
            "shipping_address": "123 Test Street, Test City",
            "items": [
                {"item_id": str(non_existent_item_id), "quantity": 1}
            ]
        },
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == f"Item with ID {non_existent_item_id} not found."

@pytest.mark.asyncio
async def test_get_all_orders(client: AsyncClient, test_order: Order, test_user_token: str):
    response = await client.get(
        f"{settings.API_V1_STR}/orders/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    orders_data = response.json()
    assert isinstance(orders_data, list)
    assert any(order["id"] == str(test_order.id) for order in orders_data)

@pytest.mark.asyncio
async def test_get_order_by_id(client: AsyncClient, test_order: Order, test_user_token: str):
    response = await client.get(
        f"{settings.API_V1_STR}/orders/{test_order.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    order_data = OrderRead(**response.json())
    assert order_data.id == test_order.id
    assert order_data.status == test_order.status
    assert order_data.total_amount == test_order.total_amount

@pytest.mark.asyncio
async def test_get_order_by_id_not_found(client: AsyncClient, test_user_token: str):
    non_existent_order_id = uuid.uuid4()
    response = await client.get(
        f"{settings.API_V1_STR}/orders/{non_existent_order_id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == f"Order with ID {non_existent_order_id} not found."

@pytest.mark.asyncio
async def test_update_order_status(client: AsyncClient, test_order: Order, admin_user_token: str):
    # Only admin can update order status
    response = await client.patch(
        f"{settings.API_V1_STR}/orders/{test_order.id}/status",
        json={"status": OrderStatus.PROCESSING.value},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 200
    order_data = OrderRead(**response.json())
    assert order_data.id == test_order.id
    assert order_data.status == OrderStatus.PROCESSING

@pytest.mark.asyncio
async def test_update_order_status_forbidden_for_normal_user(client: AsyncClient, test_order: Order, test_user_token: str):
    response = await client.patch(
        f"{settings.API_V1_STR}/orders/{test_order.id}/status",
        json={"status": OrderStatus.PROCESSING.value},
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update order status."

@pytest.mark.asyncio
async def test_update_order_status_invalid_transition(client: AsyncClient, test_order: Order, admin_user_token: str):
    # First, update to DELIVERED
    await client.patch(
        f"{settings.API_V1_STR}/orders/{test_order.id}/status",
        json={"status": OrderStatus.DELIVERED.value},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )

    # Now try to transition back to PENDING, which is invalid
    response = await client.patch(
        f"{settings.API_V1_STR}/orders/{test_order.id}/status",
        json={"status": OrderStatus.PENDING.value},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == f"Invalid status transition from {OrderStatus.DELIVERED.value} to {OrderStatus.PENDING.value}."

@pytest.mark.asyncio
async def test_delete_order_admin_only(client: AsyncClient, test_order: Order, admin_user_token: str):
    response = await client.delete(
        f"{settings.API_V1_STR}/orders/{test_order.id}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 204
    
    # Verify deletion
    fetch_response = await client.get(
        f"{settings.API_V1_STR}/orders/{test_order.id}",
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert fetch_response.status_code == 404

@pytest.mark.asyncio
async def test_delete_order_forbidden_for_normal_user(client: AsyncClient, test_order: Order, test_user_token: str):
    response = await client.delete(
        f"{settings.API_V1_STR}/orders/{test_order.id}",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this order."

```