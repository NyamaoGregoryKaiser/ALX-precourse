```python
"""
Unit tests for the ALX-Shop service layer.

These tests focus on the business logic within the service functions,
mocking database interactions to ensure isolation and speed.
"""

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import user_service, product_service, order_service
from app.schemas.user import UserCreate, UserUpdate, UserRead, UserRole
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead
from app.schemas.order import OrderCreate, OrderUpdate, OrderRead, OrderItemCreate, OrderStatus
from app.models.user import User as ORMUser
from app.models.product import Product as ORMProduct
from app.models.order import Order as ORMOrder, OrderItem as ORMOrderItem
from app.core.security import get_password_hash # For user service internal calls

@pytest.fixture
def mock_db_session():
    """
    Fixture to provide a mock AsyncSession for service tests.
    """
    session = AsyncMock(spec=AsyncSession)
    session.execute.return_value.scalar_one_or_none.return_value = None
    session.execute.return_value.scalars.return_value.all.return_value = []
    session.add.return_value = None
    session.flush.return_value = None
    session.refresh.return_value = None
    session.delete.return_value = None
    return session

# --- User Service Tests ---

@pytest.mark.asyncio
async def test_get_user_by_id_found(mock_db_session):
    mock_user_orm = ORMUser(id=1, email="test@example.com", hashed_password="hashed", full_name="Test User", role=ORMUser.UserRole.CUSTOMER)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = mock_user_orm
    user = await user_service.get_user_by_id(1, db=mock_db_session)
    assert user is not None
    assert user.id == 1
    assert user.email == "test@example.com"

@pytest.mark.asyncio
async def test_get_user_by_id_not_found(mock_db_session):
    user = await user_service.get_user_by_id(999, db=mock_db_session)
    assert user is None

@pytest.mark.asyncio
async def test_create_user(mock_db_session):
    user_create = UserCreate(email="new@example.com", password="password", full_name="New User", role=UserRole.CUSTOMER)
    with patch('app.services.user_service.get_password_hash', return_value='hashed_password') as mock_hash:
        # Mocking the ORM object creation and behavior after add/flush/refresh
        mock_db_session.add.side_effect = lambda x: setattr(x, 'id', 1)
        mock_db_session.refresh.side_effect = lambda x, **kwargs: x # Simulate refresh for defaults like id/timestamps

        user = await user_service.create_user(user_create.model_dump(), db=mock_db_session)
        
        mock_hash.assert_called_once_with(user_create.password)
        mock_db_session.add.assert_called_once()
        mock_db_session.flush.assert_called_once()
        mock_db_session.refresh.assert_called_once()
        assert user.email == user_create.email
        assert user.id == 1 # Check if ID was set by mock
        assert user.role == UserRole.CUSTOMER

@pytest.mark.asyncio
async def test_update_user(mock_db_session):
    existing_user_orm = ORMUser(id=1, email="old@example.com", hashed_password="old_hashed", full_name="Old User", role=ORMUser.UserRole.CUSTOMER)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_user_orm

    user_update = UserUpdate(full_name="Updated User", email="updated@example.com")
    with patch('app.services.user_service.get_password_hash', return_value='new_hashed') as mock_hash:
        user = await user_service.update_user(1, user_update, db=mock_db_session)
        
        assert user is not None
        assert user.full_name == "Updated User"
        assert user.email == "updated@example.com"
        mock_db_session.add.assert_called_once_with(existing_user_orm)
        mock_db_session.refresh.assert_called_once()
        mock_hash.assert_not_called() # No password update

@pytest.mark.asyncio
async def test_delete_user(mock_db_session):
    existing_user_orm = ORMUser(id=1, email="delete@example.com", hashed_password="hashed")
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_user_orm
    result = await user_service.delete_user(1, db=mock_db_session)
    assert result is True
    mock_db_session.delete.assert_called_once_with(existing_user_orm)

# --- Product Service Tests ---

@pytest.mark.asyncio
async def test_get_product_by_id_found(mock_db_session):
    mock_product_orm = ORMProduct(id=1, name="Product A", price=10.0, stock=5)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = mock_product_orm
    product = await product_service.get_product_by_id(1, db=mock_db_session)
    assert product is not None
    assert product.id == 1
    assert product.name == "Product A"

@pytest.mark.asyncio
async def test_create_product(mock_db_session):
    product_create = ProductCreate(name="New Product", description="Desc", price=100.0, stock=10)
    mock_db_session.add.side_effect = lambda x: setattr(x, 'id', 1)
    mock_db_session.refresh.side_effect = lambda x, **kwargs: x
    product = await product_service.create_product(product_create, db=mock_db_session)
    assert product.name == "New Product"
    assert product.id == 1
    mock_db_session.add.assert_called_once()
    mock_db_session.flush.assert_called_once()
    mock_db_session.refresh.assert_called_once()

@pytest.mark.asyncio
async def test_update_product_stock_decrement(mock_db_session):
    existing_product_orm = ORMProduct(id=1, name="Item", price=10.0, stock=10)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_product_orm
    mock_db_session.refresh.side_effect = lambda x, **kwargs: x

    updated_product = await product_service.update_product_stock(1, -3, db=mock_db_session)
    assert updated_product.stock == 7
    mock_db_session.add.assert_called_once_with(existing_product_orm)
    mock_db_session.flush.assert_called_once()
    mock_db_session.refresh.assert_called_once()

@pytest.mark.asyncio
async def test_update_product_stock_negative_fail(mock_db_session):
    existing_product_orm = ORMProduct(id=1, name="Item", price=10.0, stock=2)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_product_orm
    
    with pytest.raises(ValueError, match="Not enough stock"):
        await product_service.update_product_stock(1, -3, db=mock_db_session)
    mock_db_session.add.assert_not_called() # No database write should happen

# --- Order Service Tests ---

@pytest.mark.asyncio
async def test_create_order(mock_db_session):
    order_items_in = [
        OrderItemCreate(product_id=1, quantity=2, price_at_purchase=10.0),
        OrderItemCreate(product_id=2, quantity=1, price_at_purchase=20.0)
    ]
    total_price = 40.0
    user_id = 1

    mock_db_session.add.side_effect = lambda x: setattr(x, 'id', 101 if isinstance(x, ORMOrder) else 201)
    mock_db_session.refresh.side_effect = lambda x, **kwargs: x

    order = await order_service.create_order(user_id, order_items_in, total_price, db=mock_db_session)

    assert order is not None
    assert order.user_id == user_id
    assert order.total_price == total_price
    assert order.status == OrderStatus.PENDING
    assert len(order.items) == 2
    mock_db_session.add.call_count == 3 # 1 for order, 2 for order items
    mock_db_session.flush.call_count == 2
    mock_db_session.refresh.call_count >= 1 # At least one for the order

@pytest.mark.asyncio
async def test_get_order_by_id_found(mock_db_session):
    mock_order_orm = ORMOrder(id=1, user_id=1, total_price=30.0, status=ORMOrder.OrderStatus.PENDING)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = mock_order_orm
    order = await order_service.get_order_by_id(1, db=mock_db_session)
    assert order is not None
    assert order.id == 1

@pytest.mark.asyncio
async def test_update_order_status(mock_db_session):
    existing_order_orm = ORMOrder(id=1, user_id=1, total_price=30.0, status=ORMOrder.OrderStatus.PENDING)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_order_orm
    mock_db_session.refresh.side_effect = lambda x, **kwargs: x

    order_update = OrderUpdate(status=OrderStatus.SHIPPED)
    updated_order = await order_service.update_order(1, order_update, db=mock_db_session)

    assert updated_order is not None
    assert updated_order.status == OrderStatus.SHIPPED
    mock_db_session.add.assert_called_once_with(existing_order_orm)
    mock_db_session.flush.assert_called_once()
    mock_db_session.refresh.assert_called_once()

@pytest.mark.asyncio
async def test_delete_order(mock_db_session):
    existing_order_orm = ORMOrder(id=1, user_id=1, total_price=30.0, status=ORMOrder.OrderStatus.PENDING)
    mock_db_session.execute.return_value.scalar_one_or_none.return_value = existing_order_orm
    result = await order_service.delete_order(1, db=mock_db_session)
    assert result is True
    mock_db_session.delete.assert_called_once_with(existing_order_orm)

```