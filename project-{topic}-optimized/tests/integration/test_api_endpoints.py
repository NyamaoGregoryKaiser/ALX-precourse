import pytest
from httpx import AsyncClient
from app.db.models import User, Item, Order, UserRole, OrderStatus
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.user import UserRegister, UserUpdate
from app.schemas.order import OrderCreate, OrderItemCreate, OrderUpdate
from app.utils.security import decode_token

# --- Authentication Endpoints ---

@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    user_data = UserRegister(email="register@example.com", password="StrongPassword123")
    response = await client.post("/api/v1/auth/register", json=user_data.model_dump())
    assert response.status_code == 201
    assert response.json()["email"] == user_data.email

@pytest.mark.asyncio
async def test_register_user_email_exists(client: AsyncClient, active_user: User):
    user_data = UserRegister(email=active_user.email, password="NewPassword123")
    response = await client.post("/api/v1/auth/register", json=user_data.model_dump())
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_for_access_token_success(client: AsyncClient, active_user: User):
    login_data = {"username": active_user.email, "password": "activepassword"}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()
    assert response.json()["token_type"] == "bearer"

    access_token_payload = decode_token(response.json()["access_token"])
    assert access_token_payload["sub"] == str(active_user.id)
    assert access_token_payload["email"] == active_user.email
    assert access_token_payload["type"] == "access"

@pytest.mark.asyncio
async def test_login_for_access_token_invalid_credentials(client: AsyncClient):
    login_data = {"username": "nonexistent@example.com", "password": "wrongpassword"}
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_refresh_token_success(client: AsyncClient, active_user_refresh_token: str, active_user: User):
    refresh_request = {"refresh_token": active_user_refresh_token}
    response = await client.post("/api/v1/auth/refresh-token", json=refresh_request)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()

    # Validate new access token
    access_token_payload = decode_token(response.json()["access_token"])
    assert access_token_payload["sub"] == str(active_user.id)
    assert access_token_payload["type"] == "access"
    
    # Validate new refresh token
    refresh_token_payload = decode_token(response.json()["refresh_token"])
    assert refresh_token_payload["sub"] == str(active_user.id)
    assert refresh_token_payload["type"] == "refresh"

@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    refresh_request = {"refresh_token": "invalid_refresh_token_string"}
    response = await client.post("/api/v1/auth/refresh-token", json=refresh_request)
    assert response.status_code == 401
    assert "Invalid or expired refresh token" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_users_me_success(client: AsyncClient, authenticated_user_token: str, active_user: User):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == active_user.email
    assert response.json()["id"] == active_user.id

@pytest.mark.asyncio
async def test_read_users_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


# --- User Endpoints ---

@pytest.mark.asyncio
async def test_read_users_admin_success(client: AsyncClient, authenticated_admin_token: str):
    response = await client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"}
    )
    assert response.status_code == 200
    assert "data" in response.json()
    assert "total" in response.json()
    assert response.json()["limit"] == 100 # Default limit

@pytest.mark.asyncio
async def test_read_users_regular_user_forbidden(client: AsyncClient, authenticated_user_token: str):
    response = await client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_user_by_id_self_success(client: AsyncClient, authenticated_user_token: str, active_user: User):
    response = await client.get(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == active_user.id
    assert response.json()["email"] == active_user.email

@pytest.mark.asyncio
async def test_read_user_by_id_other_user_admin_success(client: AsyncClient, authenticated_admin_token: str, active_user: User):
    response = await client.get(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == active_user.id
    assert response.json()["email"] == active_user.email

@pytest.mark.asyncio
async def test_read_user_by_id_other_user_forbidden(client: AsyncClient, authenticated_user_token: str, create_test_admin: User):
    response = await client.get(
        f"/api/v1/users/{create_test_admin.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 403
    assert "Not authorized to access this user's profile" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_user_self_success(client: AsyncClient, authenticated_user_token: str, active_user: User):
    update_data = UserUpdate(full_name="Updated Test Name")
    response = await client.put(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == update_data.full_name

@pytest.mark.asyncio
async def test_update_user_admin_role_change_success(client: AsyncClient, authenticated_admin_token: str, active_user: User):
    update_data = UserUpdate(role=UserRole.ADMIN, is_active=False)
    response = await client.put(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 200
    assert response.json()["id"] == active_user.id
    assert response.json()["role"] == UserRole.ADMIN
    assert response.json()["is_active"] == False

@pytest.mark.asyncio
async def test_update_user_self_role_change_forbidden(client: AsyncClient, authenticated_user_token: str, active_user: User):
    update_data = UserUpdate(role=UserRole.ADMIN)
    response = await client.put(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 403
    assert "Not authorized to change user role" in response.json()["detail"]

@pytest.mark.asyncio
async def test_delete_user_admin_success(client: AsyncClient, authenticated_admin_token: str, active_user: User):
    response = await client.delete(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == active_user.id

    # Verify user is actually deleted
    response = await client.get(
        f"/api/v1/users/{active_user.id}",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"}
    )
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_delete_user_regular_user_forbidden(client: AsyncClient, authenticated_user_token: str, create_test_admin: User):
    response = await client.delete(
        f"/api/v1/users/{create_test_admin.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 403
    assert "Only administrators can delete users" in response.json()["detail"]


# --- Item Endpoints ---

@pytest.mark.asyncio
async def test_read_items_success(client: AsyncClient, test_item: Item):
    response = await client.get("/api/v1/items")
    assert response.status_code == 200
    assert "data" in response.json()
    assert test_item.name in [item["name"] for item in response.json()["data"]]

@pytest.mark.asyncio
async def test_read_item_by_id_success(client: AsyncClient, test_item: Item):
    response = await client.get(f"/api/v1/items/{test_item.id}")
    assert response.status_code == 200
    assert response.json()["id"] == test_item.id
    assert response.json()["name"] == test_item.name

@pytest.mark.asyncio
async def test_create_item_success(client: AsyncClient, authenticated_user_token: str, active_user: User):
    item_data = ItemCreate(name="New Awesome Gadget", description="A super cool gadget.", price=299.99, stock_quantity=10)
    response = await client.post(
        "/api/v1/items",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=item_data.model_dump()
    )
    assert response.status_code == 201
    assert response.json()["name"] == item_data.name
    assert response.json()["owner_id"] == active_user.id

@pytest.mark.asyncio
async def test_update_item_owner_success(client: AsyncClient, authenticated_user_token: str, test_item: Item):
    update_data = ItemUpdate(price=109.99, stock_quantity=45)
    response = await client.put(
        f"/api/v1/items/{test_item.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 200
    assert response.json()["id"] == test_item.id
    assert response.json()["price"] == 109.99
    assert response.json()["stock_quantity"] == 45

@pytest.mark.asyncio
async def test_update_item_unauthorized(client: AsyncClient, authenticated_admin_token: str, create_test_item, active_user: User, create_test_admin: User):
    # Create an item owned by a regular user, try to update with admin token
    item_by_user = await create_test_item(name="User Item", owner=active_user)
    update_data = ItemUpdate(price=11.11)
    response = await client.put(
        f"/api/v1/items/{item_by_user.id}",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    # Admin should be authorized to update any item
    assert response.status_code == 200
    assert response.json()["price"] == 11.11

    # Now try with a non-owner non-admin user
    another_user = await client.post("/api/v1/auth/register", json={"email": "another@user.com", "password": "password"}).json()
    login_data = {"username": "another@user.com", "password": "password"}
    login_response = await client.post("/api/v1/auth/login", data=login_data)
    another_user_token = login_response.json()["access_token"]

    response = await client.put(
        f"/api/v1/items/{item_by_user.id}",
        headers={"Authorization": f"Bearer {another_user_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 403
    assert "Not authorized to update this item" in response.json()["detail"]


@pytest.mark.asyncio
async def test_delete_item_owner_success(client: AsyncClient, authenticated_user_token: str, test_item: Item):
    response = await client.delete(
        f"/api/v1/items/{test_item.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == test_item.id

    # Verify item is deleted
    response = await client.get(f"/api/v1/items/{test_item.id}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_delete_item_admin_success(client: AsyncClient, authenticated_admin_token: str, create_test_item, active_user: User):
    item_by_user = await create_test_item(name="User Item to Delete", owner=active_user)
    response = await client.delete(
        f"/api/v1/items/{item_by_user.id}",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == item_by_user.id

    # Verify item is deleted
    response = await client.get(f"/api/v1/items/{item_by_user.id}")
    assert response.status_code == 404


# --- Order Endpoints ---

@pytest.mark.asyncio
async def test_create_order_success(client: AsyncClient, authenticated_user_token: str, active_user: User, create_test_item):
    item1 = await create_test_item(name="Orderable Item 1", owner=active_user, price=10.0, stock_quantity=10)
    item2 = await create_test_item(name="Orderable Item 2", owner=active_user, price=20.0, stock_quantity=5)
    
    order_data = OrderCreate(items=[
        OrderItemCreate(item_id=item1.id, quantity=2),
        OrderItemCreate(item_id=item2.id, quantity=1)
    ])
    
    response = await client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=order_data.model_dump()
    )
    assert response.status_code == 201
    assert response.json()["user_id"] == active_user.id
    assert response.json()["total_amount"] == (10.0 * 2) + (20.0 * 1)
    assert len(response.json()["order_items"]) == 2

    # Verify stock reduction
    item1_response = await client.get(f"/api/v1/items/{item1.id}")
    assert item1_response.json()["stock_quantity"] == 8
    item2_response = await client.get(f"/api/v1/items/{item2.id}")
    assert item2_response.json()["stock_quantity"] == 4

@pytest.mark.asyncio
async def test_create_order_insufficient_stock(client: AsyncClient, authenticated_user_token: str, active_user: User, create_test_item):
    item1 = await create_test_item(name="Limited Stock Item", owner=active_user, price=10.0, stock_quantity=1)
    
    order_data = OrderCreate(items=[
        OrderItemCreate(item_id=item1.id, quantity=2) # Requesting more than available
    ])
    
    response = await client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=order_data.model_dump()
    )
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_orders_self_success(client: AsyncClient, authenticated_user_token: str, test_order: Order):
    response = await client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 200
    assert "data" in response.json()
    assert len(response.json()["data"]) > 0
    assert test_order.id in [order["id"] for order in response.json()["data"]]

@pytest.mark.asyncio
async def test_read_orders_admin_success(client: AsyncClient, authenticated_admin_token: str, test_order: Order):
    response = await client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"}
    )
    assert response.status_code == 200
    assert "data" in response.json()
    assert len(response.json()["data"]) > 0
    assert test_order.id in [order["id"] for order in response.json()["data"]] # Admin can see test_order

@pytest.mark.asyncio
async def test_read_order_by_id_self_success(client: AsyncClient, authenticated_user_token: str, test_order: Order):
    response = await client.get(
        f"/api/v1/orders/{test_order.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == test_order.id
    assert response.json()["user_id"] == test_order.user_id
    assert len(response.json()["order_items"]) > 0

@pytest.mark.asyncio
async def test_read_order_by_id_other_user_forbidden(client: AsyncClient, authenticated_user_token: str, create_test_order, active_user: User, create_test_user):
    another_user_obj = await create_test_user(email="another.user@example.com", password="password")
    order_by_another_user = await create_test_order(user=another_user_obj)
    
    response = await client.get(
        f"/api/v1/orders/{order_by_another_user.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 403
    assert "Not authorized to view this order" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_order_status_admin_success(client: AsyncClient, authenticated_admin_token: str, test_order: Order):
    update_data = OrderUpdate(status=OrderStatus.SHIPPED)
    response = await client.put(
        f"/api/v1/orders/{test_order.id}/status",
        headers={"Authorization": f"Bearer {authenticated_admin_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 200
    assert response.json()["id"] == test_order.id
    assert response.json()["status"] == OrderStatus.SHIPPED

@pytest.mark.asyncio
async def test_update_order_status_user_forbidden(client: AsyncClient, authenticated_user_token: str, test_order: Order):
    update_data = OrderUpdate(status=OrderStatus.SHIPPED)
    response = await client.put(
        f"/api/v1/orders/{test_order.id}/status",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json=update_data.model_dump(exclude_unset=True)
    )
    assert response.status_code == 403
    assert "Only admins can update order status" in response.json()["detail"]

@pytest.mark.asyncio
async def test_cancel_order_user_success(client: AsyncClient, authenticated_user_token: str, create_test_order, active_user: User, create_test_item):
    item = await create_test_item(name="Cancelable Item", owner=active_user, price=50.0, stock_quantity=10)
    order_to_cancel = await create_test_order(user=active_user, items_data=[{"item": item, "quantity": 3}], status=OrderStatus.PENDING)
    
    # Verify initial stock
    initial_item_response = await client.get(f"/api/v1/items/{item.id}")
    assert initial_item_response.json()["stock_quantity"] == 7 # 10 - 3

    response = await client.post(
        f"/api/v1/orders/{order_to_cancel.id}/cancel",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == order_to_cancel.id
    assert response.json()["status"] == OrderStatus.CANCELLED

    # Verify stock returned
    final_item_response = await client.get(f"/api/v1/items/{item.id}")
    assert final_item_response.json()["stock_quantity"] == 10 # 7 + 3

@pytest.mark.asyncio
async def test_cancel_order_already_shipped_forbidden(client: AsyncClient, authenticated_user_token: str, create_test_order, active_user: User):
    order_shipped = await create_test_order(user=active_user, status=OrderStatus.SHIPPED)
    response = await client.post(
        f"/api/v1/orders/{order_shipped.id}/cancel",
        headers={"Authorization": f"Bearer {authenticated_user_token}"}
    )
    assert response.status_code == 400
    assert "cannot be cancelled in 'shipped' status" in response.json()["detail"]
```