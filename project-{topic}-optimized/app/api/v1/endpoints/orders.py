import logging
from typing import List

from fastapi import APIRouter, Depends, status, Query
from fastapi_limiter.depends import RateLimiter
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, OrderStatus, UserRole
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.schemas.pagination import PaginatedResponse
from app.services.order_service import OrderService
from app.utils.security import get_current_active_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[OrderResponse],
            dependencies=[Depends(RateLimiter(times=20, seconds=60))], # 20 requests per minute
            summary="Get all orders",
            description="Retrieve a paginated list of orders. Users see their own, Admins see all.")
async def read_orders(
    skip: int = Query(0, ge=0, description="Number of orders to skip (offset)."),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of orders to return."),
    status_filter: OrderStatus | None = Query(None, description="Filter orders by status."),
    current_user: User = Depends(get_current_active_user),
    order_service: OrderService = Depends(lambda db=Depends(get_db): OrderService(db))
):
    """
    Retrieve a paginated list of orders.
    Regular users can only view their own orders. Administrators can view all orders.
    Orders can be filtered by their `status`.
    """
    logger.info(f"User {current_user.email} (Role: {current_user.role}) requesting orders list.")
    orders = await order_service.get_all_orders(current_user, skip=skip, limit=limit, status_filter=status_filter)
    return orders

@router.get("/{order_id}", response_model=OrderResponse,
            dependencies=[Depends(RateLimiter(times=15, seconds=60))], # 15 requests per minute
            summary="Get order by ID",
            description="Retrieve details of a single order by ID. Requires ownership or admin privileges.")
async def read_order_by_id(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    order_service: OrderService = Depends(lambda db=Depends(get_db): OrderService(db))
):
    """
    Retrieve details of a specific order by ID.
    Only the order's owner or an administrator can view the order.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) attempting to retrieve order ID {order_id}.")
    order = await order_service.get_order_by_id(order_id, current_user)
    return order

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(RateLimiter(times=5, seconds=30))], # 5 requests per 30 seconds
            summary="Create a new order",
            description="Create a new order for the current user. Requires active user authentication.")
async def create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_active_user),
    order_service: OrderService = Depends(lambda db=Depends(get_db): OrderService(db))
):
    """
    Create a new order. The order will be associated with the authenticated user.
    The total amount is calculated, and item stock is reduced.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) attempting to create a new order.")
    order = await order_service.create_order(order_in, current_user)
    return order

@router.put("/{order_id}/status", response_model=OrderResponse,
            dependencies=[Depends(RateLimiter(times=5, seconds=60))], # 5 requests per minute
            summary="Update order status",
            description="Update the status of an existing order. Requires admin privileges.")
async def update_order_status(
    order_id: int,
    order_in: OrderUpdate,
    current_admin_user: User = Depends(get_current_admin_user), # Admin access required
    order_service: OrderService = Depends(lambda db=Depends(get_db): OrderService(db))
):
    """
    Update the status of a specific order by ID.
    Only administrators can update order status.
    """
    logger.info(f"Admin user {current_admin_user.email} attempting to update status for order ID {order_id}.")
    updated_order = await order_service.update_order_status(order_id, order_in, current_admin_user)
    return updated_order

@router.post("/{order_id}/cancel", response_model=OrderResponse,
            dependencies=[Depends(RateLimiter(times=3, seconds=120))], # 3 requests per 2 minutes
            summary="Cancel an order",
            description="Cancel an existing order. Users can cancel their own pending/processing orders; Admins can cancel any.")
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    order_service: OrderService = Depends(lambda db=Depends(get_db): OrderService(db))
):
    """
    Cancel an existing order.
    Users can cancel their own orders if the status is PENDING or PROCESSING.
    Administrators can cancel any order.
    Cancelled orders will have their item stock returned.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) attempting to cancel order ID {order_id}.")
    cancelled_order = await order_service.cancel_order(order_id, current_user)
    return cancelled_order
```