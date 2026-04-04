import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException, status
from faker import Faker

from app.db.models import User, Item, Order, OrderItem, UserRole, OrderStatus
from app.schemas.user import UserRegister, UserCreate, UserUpdate
from app.schemas.item import ItemCreate, ItemUpdate
from app.schemas.order import OrderCreate, OrderItemCreate, OrderUpdate
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.item_service import ItemService
from app.services.order_service import OrderService
from app.db.crud import user_crud, item_crud, order_crud, order_item_crud
from app.utils.security import get_password_hash, verify_password

fake = Faker()

@pytest.fixture
def mock_db_session():
    """
    Fixture to provide a mock AsyncSession for service tests.
    """
    return AsyncMock()

@pytest.fixture
def mock_user_crud():
    """
    Fixture to mock user_crud.
    """
    return AsyncMock(spec=user_crud)

@pytest.fixture
def mock_item_crud():
    """
    Fixture to mock item_crud.
    """
    return AsyncMock(spec=item_crud)

@pytest.fixture
def mock_order_crud():
    """
    Fixture to mock order_crud.
    """
    return AsyncMock(spec=order_crud)

@pytest.fixture
def mock_order_item_crud():
    """
    Fixture to mock order_item_crud.
    """
    return AsyncMock(spec=order_item_crud)

# --- AuthService Tests ---

@pytest.mark.asyncio
async def test_auth_service_register_user_success(mock_db_session):
    service = AuthService(mock_db_session)
    user_in = UserRegister(email="newuser@example.com", password="StrongPassword123")
    
    # Mock crud.get_multi to return no existing users
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=[]))):
        # Mock crud.create to return a new user object
        new_user = User(id=1, email=user_in.email, hashed_password=get_password_hash(user_in.password.get_secret_value()), role=UserRole.USER)
        with patch.object(user_crud, 'create', new=AsyncMock(return_value=new_user)):
            user = await service.register_user(user_in)
            assert user.email == user_in.email
            assert verify_password(user_in.password.get_secret_value(), user.hashed_password)
            user_crud.get_multi.assert_called_once_with(mock_db_session, filters={"email": user_in.email})
            user_crud.create.assert_called_once() # We don't check params here, as password is hashed

@pytest.mark.asyncio
async def test_auth_service_register_user_email_exists(mock_db_session):
    service = AuthService(mock_db_session)
    user_in = UserRegister(email="existing@example.com", password="StrongPassword123")
    
    # Mock crud.get_multi to return an existing user
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=[User(id=1, email=user_in.email)]))):
        with pytest.raises(HTTPException) as exc_info:
            await service.register_user(user_in)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in exc_info.value.detail

@pytest.mark.asyncio
async def test_auth_service_authenticate_user_success(mock_db_session):
    service = AuthService(mock_db_session)
    login_data = LoginRequest(email="user@example.com", password="CorrectPassword")
    hashed_password = get_password_hash(login_data.password.get_secret_value())
    mock_user = User(id=1, email=login_data.email, hashed_password=hashed_password, is_active=True, role=UserRole.USER)
    
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=[mock_user]))):
        user = await service.authenticate_user(login_data)
        assert user.email == login_data.email
        assert user_crud.get_multi.called_once()

@pytest.mark.asyncio
async def test_auth_service_authenticate_user_incorrect_password(mock_db_session):
    service = AuthService(mock_db_session)
    login_data = LoginRequest(email="user@example.com", password="WrongPassword")
    hashed_password = get_password_hash("CorrectPassword")
    mock_user = User(id=1, email=login_data.email, hashed_password=hashed_password, is_active=True)
    
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=[mock_user]))):
        with pytest.raises(HTTPException) as exc_info:
            await service.authenticate_user(login_data)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in exc_info.value.detail

@pytest.mark.asyncio
async def test_auth_service_authenticate_user_inactive(mock_db_session):
    service = AuthService(mock_db_session)
    login_data = LoginRequest(email="user@example.com", password="CorrectPassword")
    hashed_password = get_password_hash(login_data.password.get_secret_value())
    mock_user = User(id=1, email=login_data.email, hashed_password=hashed_password, is_active=False)
    
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=[mock_user]))):
        with pytest.raises(HTTPException) as exc_info:
            await service.authenticate_user(login_data)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Inactive user" in exc_info.value.detail

# --- UserService Tests ---

@pytest.mark.asyncio
async def test_user_service_get_all_users(mock_db_session):
    service = UserService(mock_db_session)
    mock_users = [User(id=1, email="u1@e.com"), User(id=2, email="u2@e.com")]
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=mock_users, total=2))):
        users = await service.get_all_users(skip=0, limit=100)
        assert len(users.data) == 2
        user_crud.get_multi.assert_called_once_with(mock_db_session, skip=0, limit=100, filters={})

@pytest.mark.asyncio
async def test_user_service_get_user_by_id_success(mock_db_session):
    service = UserService(mock_db_session)
    mock_user = User(id=1, email="test@example.com")
    with patch.object(user_crud, 'get', new=AsyncMock(return_value=mock_user)):
        user = await service.get_user_by_id(1)
        assert user.id == 1
        user_crud.get.assert_called_once_with(mock_db_session, 1)

@pytest.mark.asyncio
async def test_user_service_get_user_by_id_not_found(mock_db_session):
    service = UserService(mock_db_session)
    with patch.object(user_crud, 'get', new=AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc_info:
            await service.get_user_by_id(999)
        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_user_service_create_user_success(mock_db_session):
    service = UserService(mock_db_session)
    user_in = UserCreate(email="new@example.com", password="Password123")
    mock_user = User(id=1, email=user_in.email, hashed_password=get_password_hash(user_in.password.get_secret_value()))
    
    with patch.object(user_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=[]))): # No existing email/phone
        with patch.object(user_crud, 'create', new=AsyncMock(return_value=mock_user)):
            user = await service.create_user(user_in)
            assert user.email == user_in.email
            user_crud.create.assert_called_once()

@pytest.mark.asyncio
async def test_user_service_update_user_self_success(mock_db_session):
    service = UserService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    user_in = UserUpdate(full_name="Updated Name")
    mock_user = User(id=1, email="user@e.com", full_name="Old Name")
    updated_user_obj = User(id=1, email="user@e.com", full_name="Updated Name")

    with patch.object(service, 'get_user_by_id', new=AsyncMock(return_value=mock_user)):
        with patch.object(user_crud, 'update', new=AsyncMock(return_value=updated_user_obj)):
            user = await service.update_user(1, user_in, current_user)
            assert user.full_name == "Updated Name"
            user_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_user_service_update_user_admin_success(mock_db_session):
    service = UserService(mock_db_session)
    admin_user = User(id=1, email="admin@e.com", role=UserRole.ADMIN)
    target_user = User(id=2, email="target@e.com", role=UserRole.USER)
    user_in = UserUpdate(full_name="Target Updated", role=UserRole.ADMIN, is_active=False)
    updated_target_obj = User(id=2, email="target@e.com", full_name="Target Updated", role=UserRole.ADMIN, is_active=False)

    with patch.object(service, 'get_user_by_id', new=AsyncMock(return_value=target_user)):
        with patch.object(user_crud, 'update', new=AsyncMock(return_value=updated_target_obj)):
            user = await service.update_user(2, user_in, admin_user)
            assert user.full_name == "Target Updated"
            assert user.role == UserRole.ADMIN
            assert user.is_active == False
            user_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_user_service_update_user_unauthorized(mock_db_session):
    service = UserService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    target_user = User(id=2, email="target@e.com", role=UserRole.USER)
    user_in = UserUpdate(full_name="Target Updated")

    with patch.object(service, 'get_user_by_id', new=AsyncMock(return_value=target_user)):
        with pytest.raises(HTTPException) as exc_info:
            await service.update_user(2, user_in, current_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_user_service_delete_user_admin_success(mock_db_session):
    service = UserService(mock_db_session)
    admin_user = User(id=1, email="admin@e.com", role=UserRole.ADMIN)
    target_user = User(id=2, email="target@e.com", role=UserRole.USER)
    
    with patch.object(service, 'get_user_by_id', new=AsyncMock(return_value=target_user)):
        with patch.object(user_crud, 'delete', new=AsyncMock(return_value=target_user)):
            user = await service.delete_user(2, admin_user)
            assert user.id == 2
            user_crud.delete.assert_called_once_with(mock_db_session, 2)

@pytest.mark.asyncio
async def test_user_service_delete_user_unauthorized(mock_db_session):
    service = UserService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    target_user = User(id=2, email="target@e.com", role=UserRole.USER)

    with patch.object(service, 'get_user_by_id', new=AsyncMock(return_value=target_user)):
        with pytest.raises(HTTPException) as exc_info:
            await service.delete_user(2, current_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

# --- ItemService Tests ---

@pytest.mark.asyncio
async def test_item_service_get_all_items(mock_db_session):
    service = ItemService(mock_db_session)
    mock_items = [Item(id=1, name="i1"), Item(id=2, name="i2")]
    with patch.object(item_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=mock_items, total=2))):
        items = await service.get_all_items(skip=0, limit=100)
        assert len(items.data) == 2
        item_crud.get_multi.assert_called_once_with(mock_db_session, skip=0, limit=100, filters={"is_active": True})

@pytest.mark.asyncio
async def test_item_service_create_item_success(mock_db_session):
    service = ItemService(mock_db_session)
    item_in = ItemCreate(name="New Item", price=100.0)
    owner = User(id=1, email="owner@e.com")
    mock_item = Item(id=1, name=item_in.name, price=item_in.price, owner_id=owner.id)

    with patch.object(item_crud, 'create', new=AsyncMock(return_value=mock_item)):
        item = await service.create_item(item_in, owner)
        assert item.name == item_in.name
        assert item.owner_id == owner.id
        item_crud.create.assert_called_once()

@pytest.mark.asyncio
async def test_item_service_update_item_owner_success(mock_db_session):
    service = ItemService(mock_db_session)
    owner = User(id=1, email="owner@e.com", role=UserRole.USER)
    item_in = ItemUpdate(name="Updated Item Name")
    mock_item = Item(id=1, name="Original Name", owner_id=owner.id)
    updated_item_obj = Item(id=1, name="Updated Item Name", owner_id=owner.id)

    with patch.object(service, 'get_item_by_id', new=AsyncMock(return_value=mock_item)):
        with patch.object(item_crud, 'update', new=AsyncMock(return_value=updated_item_obj)):
            item = await service.update_item(1, item_in, owner)
            assert item.name == "Updated Item Name"
            item_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_item_service_update_item_admin_success(mock_db_session):
    service = ItemService(mock_db_session)
    admin_user = User(id=1, email="admin@e.com", role=UserRole.ADMIN)
    owner = User(id=2, email="owner@e.com", role=UserRole.USER)
    item_in = ItemUpdate(name="Admin Updated Item Name")
    mock_item = Item(id=3, name="Original Name", owner_id=owner.id)
    updated_item_obj = Item(id=3, name="Admin Updated Item Name", owner_id=owner.id)

    with patch.object(service, 'get_item_by_id', new=AsyncMock(return_value=mock_item)):
        with patch.object(item_crud, 'update', new=AsyncMock(return_value=updated_item_obj)):
            item = await service.update_item(3, item_in, admin_user)
            assert item.name == "Admin Updated Item Name"
            item_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_item_service_update_item_unauthorized(mock_db_session):
    service = ItemService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    owner = User(id=2, email="owner@e.com", role=UserRole.USER)
    item_in = ItemUpdate(name="Unauthorized Update")
    mock_item = Item(id=3, name="Original Name", owner_id=owner.id)

    with patch.object(service, 'get_item_by_id', new=AsyncMock(return_value=mock_item)):
        with pytest.raises(HTTPException) as exc_info:
            await service.update_item(3, item_in, current_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_item_service_decrease_item_stock_success(mock_db_session):
    service = ItemService(mock_db_session)
    mock_item = Item(id=1, name="Test Item", stock_quantity=10)
    updated_item_obj = Item(id=1, name="Test Item", stock_quantity=8)

    with patch.object(item_crud, 'update', new=AsyncMock(return_value=updated_item_obj)):
        item = await service.decrease_item_stock(mock_item, 2, mock_db_session)
        assert item.stock_quantity == 8
        item_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_item_service_decrease_item_stock_insufficient(mock_db_session):
    service = ItemService(mock_db_session)
    mock_item = Item(id=1, name="Test Item", stock_quantity=5)

    with pytest.raises(HTTPException) as exc_info:
        await service.decrease_item_stock(mock_item, 10, mock_db_session)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Insufficient stock" in exc_info.value.detail

# --- OrderService Tests ---

@pytest.mark.asyncio
async def test_order_service_get_all_orders_user_role(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    mock_orders = [Order(id=1, user_id=1), Order(id=2, user_id=1)]

    with patch.object(order_crud, 'get_multi', new=AsyncMock(return_value=AsyncMock(data=mock_orders, total=2))):
        orders = await service.get_all_orders(current_user)
        assert len(orders.data) == 2
        order_crud.get_multi.assert_called_once_with(
            mock_db_session, skip=0, limit=100, filters={"user_id": 1},
            order_by="created_at", order_desc=True, eager_load=["order_items.item"]
        )

@pytest.mark.asyncio
async def test_order_service_get_order_by_id_owner_success(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    mock_order = Order(id=1, user_id=1)

    with patch.object(order_crud, 'get', new=AsyncMock(return_value=mock_order)):
        # Mock session.execute and session.refresh for relationships
        mock_db_session.execute.return_value.scalars.return_value.unique.return_value.all.return_value = []
        mock_db_session.refresh.return_value = None # refresh doesn't return anything
        order = await service.get_order_by_id(1, current_user)
        assert order.id == 1
        order_crud.get.assert_called_once_with(mock_db_session, 1)

@pytest.mark.asyncio
async def test_order_service_create_order_success(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    
    mock_item1 = Item(id=1, name="Item 1", price=10.0, stock_quantity=10, is_active=True)
    mock_item2 = Item(id=2, name="Item 2", price=20.0, stock_quantity=5, is_active=True)
    
    order_in = OrderCreate(items=[
        OrderItemCreate(item_id=1, quantity=2),
        OrderItemCreate(item_id=2, quantity=1)
    ])
    
    mock_created_order = Order(id=1, user_id=1, total_amount=40.0, status=OrderStatus.PENDING)
    
    with patch.object(item_crud, 'get', side_effect=[mock_item1, mock_item2]):
        with patch.object(order_crud, 'create', new=AsyncMock(return_value=mock_created_order)):
            with patch.object(order_item_crud, 'create', new=AsyncMock(return_value=AsyncMock())):
                with patch.object(service.item_service, 'decrease_item_stock', new=AsyncMock(return_value=AsyncMock())):
                    # Mock refresh behavior
                    mock_db_session.refresh.return_value = None
                    mock_db_session.refresh.side_effect = lambda obj, attribute_names=None: None
                    
                    order = await service.create_order(order_in, current_user)
                    
                    assert order.total_amount == 40.0
                    assert order.user_id == current_user.id
                    assert order.status == OrderStatus.PENDING
                    order_crud.create.assert_called_once()
                    assert order_item_crud.create.call_count == 2
                    assert service.item_service.decrease_item_stock.call_count == 2

@pytest.mark.asyncio
async def test_order_service_create_order_insufficient_stock(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    
    mock_item1 = Item(id=1, name="Item 1", price=10.0, stock_quantity=1, is_active=True)
    
    order_in = OrderCreate(items=[
        OrderItemCreate(item_id=1, quantity=2) # Requesting 2, only 1 in stock
    ])
    
    with patch.object(item_crud, 'get', new=AsyncMock(return_value=mock_item1)):
        with pytest.raises(HTTPException) as exc_info:
            await service.create_order(order_in, current_user)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Insufficient stock" in exc_info.value.detail
        item_crud.get.assert_called_once_with(mock_db_session, 1)

@pytest.mark.asyncio
async def test_order_service_update_order_status_admin_success(mock_db_session):
    service = OrderService(mock_db_session)
    admin_user = User(id=1, email="admin@e.com", role=UserRole.ADMIN)
    mock_order = Order(id=1, user_id=2, status=OrderStatus.PENDING)
    order_in = OrderUpdate(status=OrderStatus.SHIPPED)
    updated_order_obj = Order(id=1, user_id=2, status=OrderStatus.SHIPPED)

    with patch.object(order_crud, 'get', new=AsyncMock(return_value=mock_order)):
        with patch.object(order_crud, 'update', new=AsyncMock(return_value=updated_order_obj)):
            order = await service.update_order_status(1, order_in, admin_user)
            assert order.status == OrderStatus.SHIPPED
            order_crud.get.assert_called_once_with(mock_db_session, 1)
            order_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_order_service_update_order_status_unauthorized(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    order_in = OrderUpdate(status=OrderStatus.SHIPPED)

    with pytest.raises(HTTPException) as exc_info:
        await service.update_order_status(1, order_in, current_user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_order_service_cancel_order_success(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    
    mock_item = Item(id=1, name="Test Item", stock_quantity=5, is_active=True)
    mock_order_item = OrderItem(id=1, order_id=1, item_id=1, quantity=2, price_at_order=10.0, item=mock_item)
    mock_order = Order(id=1, user_id=1, status=OrderStatus.PENDING, order_items=[mock_order_item])

    with patch.object(order_crud, 'get', new=AsyncMock(return_value=mock_order)):
        # Mock execute for order_items (which should return mock_order_item)
        mock_db_session.execute.return_value.scalars.return_value.unique.return_value.all.return_value = [mock_order_item]
        with patch.object(service.item_service, 'increase_item_stock', new=AsyncMock()):
            with patch.object(order_crud, 'update', new=AsyncMock(return_value=Order(id=1, user_id=1, status=OrderStatus.CANCELLED))):
                order = await service.cancel_order(1, current_user)
                assert order.status == OrderStatus.CANCELLED
                service.item_service.increase_item_stock.assert_called_once_with(mock_item, 2, mock_db_session)
                order_crud.update.assert_called_once()

@pytest.mark.asyncio
async def test_order_service_cancel_order_already_shipped(mock_db_session):
    service = OrderService(mock_db_session)
    current_user = User(id=1, email="user@e.com", role=UserRole.USER)
    mock_order = Order(id=1, user_id=1, status=OrderStatus.SHIPPED)

    with patch.object(order_crud, 'get', new=AsyncMock(return_value=mock_order)):
        with pytest.raises(HTTPException) as exc_info:
            await service.cancel_order(1, current_user)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot be cancelled in 'shipped' status" in exc_info.value.detail
```