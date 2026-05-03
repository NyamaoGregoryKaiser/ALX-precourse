```python
"""
Order service module for ALX-Shop.

This module encapsulates the business logic for managing customer orders, including:
- Creating new orders and their associated order items.
- Retrieving orders by ID or by user.
- Updating order status.
- Interacting with the database via SQLAlchemy, ensuring transactionality.
"""

import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db_session
from app.models.order import Order, OrderItem, OrderStatus # Import SQLAlchemy ORM models
from app.schemas.order import OrderCreate, OrderUpdate, OrderRead, OrderItemCreate, OrderStatus as SchemaOrderStatus
from app.schemas.product import ProductRead

logger = logging.getLogger(__name__)

async def create_order(
    user_id: int,
    items_in: List[OrderItemCreate],
    total_price: float,
    shipping_address: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session)
) -> OrderRead:
    """
    Creates a new order with multiple items. This method assumes stock checks
    and decrements have been handled upstream (e.g., in the API endpoint).

    Args:
        user_id (int): The ID of the user placing the order.
        items_in (List[OrderItemCreate]): A list of order item data.
        total_price (float): The pre-calculated total price for the order.
        shipping_address (Optional[str]): The shipping address for the order.
        db (AsyncSession): The database session.

    Returns:
        OrderRead: The newly created order's details.
    """
    logger.info(f"Creating new order for user {user_id} with {len(items_in)} items.")

    # Create the order object
    db_order = Order(
        user_id=user_id,
        total_price=total_price,
        status=OrderStatus.PENDING, # Initial status
        shipping_address=shipping_address
    )
    db.add(db_order)
    await db.flush() # Flush to get db_order.id before creating order items

    # Create order items
    db_order_items = []
    for item_in in items_in:
        db_order_item = OrderItem(
            order_id=db_order.id,
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            price_at_purchase=item_in.price_at_purchase
        )
        db_order_items.append(db_order_item)
        db.add(db_order_item)

    await db.flush() # Flush to persist order items

    await db.refresh(db_order) # Refresh to load relationships and updated fields
    await db.refresh(db_order, attribute_names={"items"}) # Eagerly load items relation
    for item in db_order.items:
        await db.refresh(item, attribute_names={"product"}) # Eagerly load product relation for each item

    logger.info(f"Order {db_order.id} for user {user_id} created successfully.")
    return OrderRead.model_validate(db_order)


async def get_order_by_id(order_id: int, db: AsyncSession = Depends(get_db_session)) -> Optional[OrderRead]:
    """
    Retrieves a single order by its ID, including its associated items and product details.

    Args:
        order_id (int): The ID of the order to retrieve.
        db (AsyncSession): The database session.

    Returns:
        Optional[OrderRead]: The order's data if found, else None.
    """
    logger.debug(f"Fetching order with ID: {order_id}")
    # Use selectinload to eager load related items and their products
    query = select(Order).filter(Order.id == order_id)
    result = await db.execute(query)
    order_orm = result.scalar_one_or_none()
    if order_orm:
        logger.debug(f"Found order: {order_orm.id} for user {order_orm.user_id}")
        return OrderRead.model_validate(order_orm)
    logger.debug(f"Order with ID {order_id} not found.")
    return None

async def get_orders(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[SchemaOrderStatus] = None,
    db: AsyncSession = Depends(get_db_session)
) -> List[OrderRead]:
    """
    Retrieves a paginated list of all orders, with optional status filtering.

    Args:
        skip (int): The number of records to skip.
        limit (int): The maximum number of records to return.
        status_filter (Optional[SchemaOrderStatus]): Filter orders by status.
        db (AsyncSession): The database session.

    Returns:
        List[OrderRead]: A list of order data.
    """
    logger.debug(f"Fetching all orders with skip={skip}, limit={limit}, status_filter='{status_filter}'")
    query = select(Order)
    if status_filter:
        query = query.filter(Order.status == OrderStatus(status_filter.value))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    orders_orm = result.scalars().all()
    logger.debug(f"Retrieved {len(orders_orm)} orders.")
    return [OrderRead.model_validate(order) for order in orders_orm]

async def get_orders_by_user(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[SchemaOrderStatus] = None,
    db: AsyncSession = Depends(get_db_session)
) -> List[OrderRead]:
    """
    Retrieves a paginated list of orders for a specific user, with optional status filtering.

    Args:
        user_id (int): The ID of the user whose orders to retrieve.
        skip (int): The number of records to skip.
        limit (int): The maximum number of records to return.
        status_filter (Optional[SchemaOrderStatus]): Filter orders by status.
        db (AsyncSession): The database session.

    Returns:
        List[OrderRead]: A list of order data for the specified user.
    """
    logger.debug(f"Fetching orders for user {user_id} with skip={skip}, limit={limit}, status_filter='{status_filter}'")
    query = select(Order).filter(Order.user_id == user_id)
    if status_filter:
        query = query.filter(Order.status == OrderStatus(status_filter.value))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    orders_orm = result.scalars().all()
    logger.debug(f"Retrieved {len(orders_orm)} orders for user {user_id}.")
    return [OrderRead.model_validate(order) for order in orders_orm]

async def update_order(order_id: int, order_in: OrderUpdate, db: AsyncSession = Depends(get_db_session)) -> Optional[OrderRead]:
    """
    Updates an existing order's details, primarily its status.

    Args:
        order_id (int): The ID of the order to update.
        order_in (OrderUpdate): The Pydantic model with updated order data (e.g., status).
        db (AsyncSession): The database session.

    Returns:
        Optional[OrderRead]: The updated order's data if found and updated, else None.
    """
    logger.info(f"Updating order with ID: {order_id}")
    result = await db.execute(select(Order).filter(Order.id == order_id))
    db_order = result.scalar_one_or_none()

    if not db_order:
        logger.warning(f"Order with ID {order_id} not found for update.")
        return None

    update_data = order_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and isinstance(value, str):
            setattr(db_order, field, OrderStatus(value)) # Convert string to Enum
        else:
            setattr(db_order, field, value)

    db.add(db_order)
    await db.flush()
    await db.refresh(db_order)
    await db.refresh(db_order, attribute_names={"items"}) # Refresh to load items

    logger.info(f"Order {order_id} updated successfully to status {db_order.status.value}.")
    return OrderRead.model_validate(db_order)


async def delete_order(order_id: int, db: AsyncSession = Depends(get_db_session)) -> bool:
    """
    Deletes an order from the database, including its associated order items.

    Args:
        order_id (int): The ID of the order to delete.
        db (AsyncSession): The database session.

    Returns:
        bool: True if the order was deleted, False if not found.
    """
    logger.info(f"Attempting to delete order with ID: {order_id}")
    result = await db.execute(select(Order).filter(Order.id == order_id))
    db_order = result.scalar_one_or_none()

    if not db_order:
        logger.warning(f"Order with ID {order_id} not found for deletion.")
        return False

    # Due to `cascade="all, delete-orphan"` on `items` relationship in Order model,
    # deleting the order will automatically delete its associated order items.
    await db.delete(db_order)
    # The session commit in `get_db_session` will finalize the deletion
    logger.info(f"Order {order_id} and its items deleted successfully.")
    return True

```