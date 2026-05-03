```python
"""
API endpoints for managing customer orders.

This module defines routes for creating, retrieving, updating, and deleting orders.
It includes business logic for inventory management and integrates with `order_service`
and `product_service`. Authorization ensures users can only manage their own orders,
while admins have full access.
"""

import logging
from typing import List, Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session

from app.schemas.order import OrderCreate, OrderUpdate, OrderRead, OrderItemCreate
from app.schemas.product import ProductRead
from app.services import order_service, product_service
from app.core.security import get_current_active_user, get_current_active_admin
from app.schemas.user import UserRead
from app.core.rate_limiter import RateLimiter
from app.models.order import OrderStatus

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/orders",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description="Creates a new order for the authenticated user, checking product availability and updating inventory."
)
@RateLimiter(times=5, seconds=60) # Allow 5 order creations per minute from a user
async def create_order(
    order_in: OrderCreate,
    current_user: Annotated[UserRead, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)]
):
    """
    Creates a new order for the authenticated user.
    This involves:
    1. Validating product existence and availability for each item in the order.
    2. Calculating the total price.
    3. Decrementing product stock.
    4. Creating the order and its associated order items.

    Args:
        order_in (OrderCreate): The order data, including a list of order items.
        current_user (UserRead): The authenticated user (dependency injection).
        db (AsyncSession): The database session.

    Returns:
        OrderRead: The newly created order's details.

    Raises:
        HTTPException: If any product is not found, out of stock, or other validation errors.
    """
    logger.info(f"User {current_user.email} attempting to create a new order.")
    # Verify product availability and calculate total
    total_price = 0.0
    processed_items = []

    for item_in in order_in.items:
        product = await product_service.get_product_by_id(item_in.product_id, db=db)
        if not product:
            logger.warning(f"Order creation failed: Product ID {item_in.product_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {item_in.product_id} not found")
        if product.stock < item_in.quantity:
            logger.warning(f"Order creation failed: Product '{product.name}' (ID {item_in.product_id}) out of stock. Requested: {item_in.quantity}, Available: {product.stock}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product '{product.name}' is out of stock. Available: {product.stock}")

        total_price += product.price * item_in.quantity
        processed_items.append(
            OrderItemCreate(
                product_id=product.id,
                quantity=item_in.quantity,
                price_at_purchase=product.price
            )
        )

    # Update stock for each product
    for item_in in processed_items:
        await product_service.update_product_stock(item_in.product_id, -item_in.quantity, db=db)
        logger.debug(f"Decremented stock for product {item_in.product_id} by {item_in.quantity}.")

    # Create the order
    order = await order_service.create_order(
        user_id=current_user.id,
        items_in=processed_items,
        total_price=total_price,
        db=db
    )
    logger.info(f"Order {order.id} created successfully by user {current_user.email}.")
    return order

@router.get(
    "/orders",
    response_model=List[OrderRead],
    summary="List orders",
    description="Retrieves a list of orders. Admins can see all orders; regular users can only see their own. Supports pagination and filtering.",
)
@RateLimiter(times=10, seconds=60) # Allow 10 order list requests per minute from an IP
async def read_orders(
    current_user: Annotated[UserRead, Depends(get_current_active_user)],
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of items to return"),
    status_filter: Optional[OrderStatus] = Query(None, description="Filter orders by status"),
    db: Annotated[AsyncSession, Depends(get_db_session)]
):
    """
    Retrieves a paginated list of orders.

    - Administrators can retrieve all orders.
    - Regular users can only retrieve their own orders.

    Args:
        current_user (UserRead): The authenticated user (dependency injection).
        skip (int): The number of records to skip for pagination.
        limit (int): The maximum number of records to return.
        status_filter (Optional[OrderStatus]): Filter orders by their status.
        db (AsyncSession): The database session.

    Returns:
        List[OrderRead]: A list of order details.
    """
    logger.info(f"User {current_user.email} fetching orders with skip={skip}, limit={limit}, status_filter={status_filter}.")
    if current_user.role == UserRead.UserRole.ADMIN:
        orders = await order_service.get_orders(skip=skip, limit=limit, status_filter=status_filter, db=db)
        logger.debug(f"Admin {current_user.email} retrieved {len(orders)} orders.")
    else:
        orders = await order_service.get_orders_by_user(
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            db=db
        )
        logger.debug(f"User {current_user.email} retrieved {len(orders)} of their own orders.")
    return orders

@router.get(
    "/orders/{order_id}",
    response_model=OrderRead,
    summary="Get order by ID",
    description="Retrieves a single order by its unique ID. Admins can see any order; regular users can only see their own."
)
@RateLimiter(times=10, seconds=60) # Allow 10 order detail requests per minute from an IP
async def read_order(
    order_id: int,
    current_user: Annotated[UserRead, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)]
):
    """
    Retrieves a single order by its ID.

    Accessible by:
    - The user who placed the order.
    - An administrator.

    Args:
        order_id (int): The ID of the order to retrieve.
        current_user (UserRead): The authenticated user (dependency injection).
        db (AsyncSession): The database session.

    Returns:
        OrderRead: The order's details.

    Raises:
        HTTPException: If the order is not found or if the current user is not authorized.
    """
    logger.info(f"User {current_user.email} attempting to fetch order ID: {order_id}")
    order = await order_service.get_order_by_id(order_id, db=db)
    if not order:
        logger.warning(f"Order ID {order_id} not found by user {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Authorization check
    if current_user.role != UserRead.UserRole.ADMIN and order.user_id != current_user.id:
        logger.warning(f"Unauthorized access attempt to order {order_id} by user {current_user.email}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    logger.debug(f"Order {order_id} retrieved by user {current_user.email}.")
    return order

@router.put(
    "/orders/{order_id}",
    response_model=OrderRead,
    summary="Update an order's status (Admin only)",
    description="Updates the status of an existing order. Requires admin privileges. Users can cancel their own orders if allowed."
)
@RateLimiter(times=5, seconds=60) # Allow 5 order updates per minute from an IP
async def update_order(
    order_id: int,
    order_in: OrderUpdate,
    current_user: Annotated[UserRead, Depends(get_current_active_user)], # User or Admin
    db: Annotated[AsyncSession, Depends(get_db_session)]
):
    """
    Updates an existing order.

    - Administrators can update any aspect of any order.
    - Regular users can only update their own orders and only if the status
      change is a valid cancellation (e.g., from PENDING to CANCELLED).

    Args:
        order_id (int): The ID of the order to update.
        order_in (OrderUpdate): The updated order data (e.g., new status).
        current_user (UserRead): The authenticated user (dependency injection).
        db (AsyncSession): The database session.

    Returns:
        OrderRead: The updated order's details.

    Raises:
        HTTPException: If the order is not found, if the update is unauthorized,
                       or if the status change is invalid.
    """
    logger.info(f"User {current_user.email} attempting to update order ID: {order_id} to status: {order_in.status}.")
    order = await order_service.get_order_by_id(order_id, db=db)
    if not order:
        logger.warning(f"Order ID {order_id} not found for update by user {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if current_user.role == UserRead.UserRole.ADMIN:
        updated_order = await order_service.update_order(order_id, order_in, db=db)
        logger.info(f"Admin {current_user.email} updated order {order_id} to status {order_in.status}.")
        return updated_order
    else: # Regular user
        if order.user_id != current_user.id:
            logger.warning(f"Unauthorized user {current_user.email} attempted to update order {order_id} belonging to another user.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order"
            )
        # Allow users to cancel their own orders if pending
        if order_in.status == OrderStatus.CANCELLED and order.status == OrderStatus.PENDING:
            updated_order = await order_service.update_order(order_id, order_in, db=db)
            # Restore stock for cancelled orders
            for item in order.items:
                await product_service.update_product_stock(item.product_id, item.quantity, db=db)
                logger.debug(f"Restored stock for product {item.product_id} by {item.quantity} due to order cancellation.")
            logger.info(f"User {current_user.email} cancelled their order {order_id}.")
            return updated_order
        else:
            logger.warning(f"User {current_user.email} attempted an invalid update for order {order_id} (status: {order_in.status}, current status: {order.status}).")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change order status or users can cancel pending orders."
            )

@router.delete(
    "/orders/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an order (Admin only)",
    description="Deletes an order by ID. Requires admin privileges. This is generally discouraged in production for audit purposes."
)
@RateLimiter(times=1, seconds=300) # Allow 1 order deletion per 5 minutes from an IP
async def delete_order(
    order_id: int,
    current_admin: Annotated[UserRead, Depends(get_current_active_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)]
):
    """
    Deletes an order from the database. Accessible only by administrators.
    Note: In a real-world e-commerce system, orders are typically not hard-deleted
    but rather marked with a status like 'archived' or 'deleted_soft'.

    Args:
        order_id (int): The ID of the order to delete.
        current_admin (UserRead): The authenticated admin user (dependency injection).
        db (AsyncSession): The database session.

    Raises:
        HTTPException: If the order is not found or if the current user is not an admin.
    """
    logger.info(f"Admin {current_admin.email} attempting to delete order ID: {order_id}.")
    order = await order_service.get_order_by_id(order_id, db=db)
    if not order:
        logger.warning(f"Order ID {order_id} not found for deletion by admin {current_admin.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Important: If deleting, consider restoring stock if the order was "fulfilled" or "pending"
    # For simplicity, this example assumes deletion is a hard-delete, so stock is not restored here.
    # In a real system, you'd likely restore stock unless the order was already shipped/delivered.

    await order_service.delete_order(order_id, db=db)
    logger.info(f"Order ID {order_id} deleted by admin {current_admin.email}.")
    # No content to return on successful deletion
    return

```