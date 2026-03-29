```python
import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import uuid

from app.services import user as user_service
from app.services import item as item_service
from app.services import order as order_service
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.order import OrderCreate, OrderUpdateStatus
from app.db.models.user import User
from app.db.models.item import Item
from app.db.models.order import Order, OrderItem, OrderStatus
from app.core.exceptions import NotFoundException, ConflictException, ForbiddenException, BadRequestException
from app.core.security import get_password_hash, verify_password

# --- User Service Tests ---
@pytest.mark.asyncio
async def test_create_user(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    user_data = UserCreate(email="newuser@example.com", password="securepassword", full_name="New User")

    mocker.patch("app.db.models.user.User.__init__", return_value=None)
    mocker.patch("app.core.security.get_password_hash", return_value="hashed_password")

    user_result = await user_service.create_user(session=mock_session, user_create=user_data)

    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
    mock_session.refresh.assert_called_once()
    assert user_result.email == user_data.email
    assert user_result.hashed_password == "hashed_password"

@pytest.mark.asyncio
async def test_create_user_email_conflict(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    user_data = UserCreate(email="existing@example.com", password="securepassword")

    mock_session.commit.side_effect = IntegrityError("duplicate key", {}, {})
    mocker.patch("app.db.models.user.User.__init__", return_value=None)
    mocker.patch("app.core.security.get_password_hash", return_value="hashed_password")

    with pytest.raises(ConflictException, match="Email already registered"):
        await user_service.create_user(session=mock_session, user_create=user_data)

@pytest.mark.asyncio
async def test_get_user_by_email(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    expected_user = User(id=uuid.uuid4(), email="test@example.com", hashed_password="hashed")

    mock_session.execute.return_value.scalar_one_or_none.return_value = expected_user

    user = await user_service.get_user_by_email(mock_session, "test@example.com")

    assert user.email == expected_user.email
    mock_session.execute.assert_called_once()

@pytest.mark.asyncio
async def test_get_user_by_email_not_found(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute.return_value.scalar_one_or_none.return_value = None

    user = await user_service.get_user_by_email(mock_session, "nonexistent@example.com")

    assert user is None

# --- Item Service Tests ---
@pytest.mark.asyncio
async def test_create_item(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    user_id = uuid.uuid4()
    item_data = ItemCreate(name="New Item", description="Description", price=10.0)

    mocker.patch("app.db.models.item.Item.__init__", return_value=None)

    item_result = await item_service.create_item(mock_session, item_create=item_data, owner_id=user_id)

    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
    mock_session.refresh.assert_called_once()
    assert item_result.name == item_data.name
    assert item_result.owner_id == user_id

@pytest.mark.asyncio
async def test_get_item_by_id(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    item_id = uuid.uuid4()
    expected_item = Item(id=item_id, name="Test Item", price=10.0, owner_id=uuid.uuid4())
    
    mock_session.execute.return_value.scalar_one_or_none.return_value = expected_item

    item = await item_service.get_item_by_id(mock_session, item_id)
    
    assert item.id == item_id
    mock_session.execute.assert_called_once()

@pytest.mark.asyncio
async def test_update_item(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    item_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    existing_item = Item(id=item_id, name="Old Item", price=5.0, owner_id=owner_id)
    
    mocker.patch("app.services.item.get_item_by_id", return_value=existing_item)
    
    item_update_data = ItemUpdate(name="Updated Item", price=15.0)
    
    updated_item = await item_service.update_item(
        mock_session, item_id=item_id, item_update=item_update_data, current_user_id=owner_id
    )
    
    mock_session.commit.assert_called_once()
    mock_session.refresh.assert_called_once()
    assert updated_item.name == "Updated Item"
    assert updated_item.price == 15.0

@pytest.mark.asyncio
async def test_update_item_not_owner(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    item_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    existing_item = Item(id=item_id, name="Old Item", price=5.0, owner_id=owner_id)
    
    mocker.patch("app.services.item.get_item_by_id", return_value=existing_item)
    
    item_update_data = ItemUpdate(name="Updated Item")
    
    with pytest.raises(ForbiddenException):
        await item_service.update_item(
            mock_session, item_id=item_id, item_update=item_update_data, current_user_id=other_user_id
        )

# --- Order Service Tests ---
@pytest.mark.asyncio
async def test_create_order(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    customer_id = uuid.uuid4()
    item_id_1 = uuid.uuid4()
    item_id_2 = uuid.uuid4()
    
    # Mock items that would be fetched from the DB
    item_1 = Item(id=item_id_1, name="Item A", description="", price=10.0, owner_id=uuid.uuid4())
    item_2 = Item(id=item_id_2, name="Item B", description="", price=20.0, owner_id=uuid.uuid4())
    
    mocker.patch("app.services.item.get_item_by_id", side_effect=[item_1, item_2])
    
    order_create_data = OrderCreate(
        shipping_address="123 Street",
        items=[
            {"item_id": item_id_1, "quantity": 1},
            {"item_id": item_id_2, "quantity": 2},
        ]
    )
    
    # Mock Order and OrderItem creation
    order_mock = AsyncMock(spec=Order)
    order_mock.id = uuid.uuid4()
    order_mock.order_items = []
    
    # Patch the constructor calls directly
    mocker.patch("app.db.models.order.Order.__init__", return_value=None)
    mocker.patch("app.db.models.order.OrderItem.__init__", return_value=None)
    
    # Ensure add, commit, refresh are called
    mock_session.add.side_effect = lambda obj: None # Prevent actual __init__ call for added objects
    mock_session.commit.return_value = None
    mock_session.refresh.return_value = None
    
    order_result = await order_service.create_order(mock_session, order_create=order_create_data, customer_id=customer_id)
    
    assert order_result.customer_id == customer_id
    assert order_result.total_amount == (10.0 * 1) + (20.0 * 2) # 10 + 40 = 50.0
    assert mock_session.add.call_count >= 3 # 1 for order, 2 for order_items
    mock_session.commit.assert_called_once()
    mock_session.refresh.assert_called_once()
    
@pytest.mark.asyncio
async def test_create_order_item_not_found(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    customer_id = uuid.uuid4()
    non_existent_item_id = uuid.uuid4()
    
    mocker.patch("app.services.item.get_item_by_id", return_value=None) # Item not found
    
    order_create_data = OrderCreate(
        shipping_address="123 Street",
        items=[{"item_id": non_existent_item_id, "quantity": 1}]
    )
    
    with pytest.raises(NotFoundException, match=f"Item with ID {non_existent_item_id} not found."):
        await order_service.create_order(mock_session, order_create=order_create_data, customer_id=customer_id)

@pytest.mark.asyncio
async def test_update_order_status(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    order_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    existing_order = Order(id=order_id, customer_id=customer_id, status=OrderStatus.PENDING, total_amount=100.0)
    
    mocker.patch("app.services.order.get_order_by_id", return_value=existing_order)
    
    status_update_data = OrderUpdateStatus(status=OrderStatus.SHIPPED)
    
    updated_order = await order_service.update_order_status(
        mock_session, order_id=order_id, order_status_update=status_update_data
    )
    
    mock_session.commit.assert_called_once()
    mock_session.refresh.assert_called_once()
    assert updated_order.status == OrderStatus.SHIPPED

@pytest.mark.asyncio
async def test_update_order_status_invalid_transition(mocker):
    mock_session = AsyncMock(spec=AsyncSession)
    order_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    
    existing_order = Order(id=order_id, customer_id=customer_id, status=OrderStatus.DELIVERED, total_amount=100.0)
    
    mocker.patch("app.services.order.get_order_by_id", return_value=existing_order)
    
    status_update_data = OrderUpdateStatus(status=OrderStatus.PENDING) # Cannot go from DELIVERED to PENDING
    
    with pytest.raises(BadRequestException, match="Invalid status transition"):
        await order_service.update_order_status(
            mock_session, order_id=order_id, order_status_update=status_update_data
        )

```