import logging
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.crud import order_crud, order_item_crud, item_crud
from app.db.models import Order, OrderItem, User, Item, OrderStatus, UserRole
from app.schemas.order import OrderCreate, OrderUpdate
from app.schemas.pagination import PaginatedResponse
from app.services.item_service import ItemService # Import ItemService for stock management

logger = logging.getLogger(__name__)

class OrderService:
    """
    Service layer for Order related operations.
    Handles business logic for creating, reading, updating, and deleting orders.
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.item_service = ItemService(db_session)

    async def get_all_orders(
        self,
        current_user: User,
        skip: int = 0,
        limit: int = 100,
        status_filter: OrderStatus | None = None
    ) -> PaginatedResponse[Order]:
        """
        Retrieves a paginated list of orders.
        Admins can see all orders, regular users can only see their own.
        :param current_user: The authenticated User object.
        :param skip: Number of orders to skip.
        :param limit: Maximum number of orders to return.
        :param status_filter: Optional filter by order status.
        :return: PaginatedResponse containing Order objects.
        """
        filters = {}
        if current_user.role != UserRole.ADMIN:
            filters["user_id"] = current_user.id
        if status_filter:
            filters["status"] = status_filter

        # Eager load order_items and their associated items for comprehensive response
        orders = await order_crud.get_multi(
            self.db_session,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by="created_at",
            order_desc=True,
            eager_load=["order_items.item"] # Nested eager loading
        )
        logger.debug(f"Retrieved {len(orders.data)} orders for user {current_user.id}.")
        return orders

    async def get_order_by_id(self, order_id: int, current_user: User) -> Order:
        """
        Retrieves a single order by its ID.
        Only the owner or an admin can view the order.
        :param order_id: The ID of the order to retrieve.
        :param current_user: The authenticated User object.
        :return: The Order database object.
        :raises HTTPException: If the order is not found or user is not authorized.
        """
        order = await order_crud.get(self.db_session, order_id)
        if not order:
            logger.warning(f"Order with ID {order_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
        if order.user_id != current_user.id and current_user.role != UserRole.ADMIN:
            logger.warning(f"User {current_user.id} attempted to access order {order_id} "
                           f"owned by {order.user_id} without authorization.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this order")
        
        # Eager load order_items and their associated items
        # Re-fetch with eager load to ensure relationships are populated
        order_with_items_stmt = (
            order_crud.get_multi(
                self.db_session,
                filters={"id": order_id},
                eager_load=["order_items.item"]
            )
        )
        result = await order_crud.get(self.db_session, order_id) # Getting the scalar object first
        if result:
            # Manually load the relationships after fetching
            await self.db_session.execute(
                selectinload(Order.order_items).selectinload(OrderItem.item).where(Order.id == order_id)
            )
            await self.db_session.refresh(result, attribute_names=['order_items'])

        logger.debug(f"Retrieved order {order_id} for user {current_user.id}.")
        return result


    async def create_order(self, order_in: OrderCreate, current_user: User) -> Order:
        """
        Creates a new order for the current user.
        Handles stock reduction and total amount calculation.
        :param order_in: Pydantic model containing order creation data (list of items).
        :param current_user: The authenticated User object.
        :return: The newly created Order database object.
        :raises HTTPException: If any item is not found, out of stock, or quantity is invalid.
        """
        if not order_in.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must contain at least one item")

        total_amount = 0.0
        order_items_to_create = []
        items_to_update_stock: List[tuple[Item, int]] = [] # (item_obj, quantity_to_decrease)

        # Validate items and calculate total amount in a single pass
        for item_data in order_in.items:
            item = await item_crud.get(self.db_session, item_data.item_id)
            if not item or not item.is_active:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item with ID {item_data.item_id} not found or inactive")
            if item.stock_quantity < item_data.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for item '{item.name}'")
            if item_data.quantity <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Quantity for item '{item.name}' must be positive")

            total_amount += item.price * item_data.quantity
            order_items_to_create.append({
                "item_id": item.id,
                "quantity": item_data.quantity,
                "price_at_order": item.price # Capture price at the time of order
            })
            items_to_update_stock.append((item, item_data.quantity))

        # Create the order
        order_data = {
            "user_id": current_user.id,
            "total_amount": total_amount,
            "status": OrderStatus.PENDING # Initial status
        }
        new_order = await order_crud.create(self.db_session, order_data)

        # Create order items and update stock (within the same transaction context)
        for order_item_data in order_items_to_create:
            order_item_data["order_id"] = new_order.id
            await order_item_crud.create(self.db_session, order_item_data)
        
        for item, quantity in items_to_update_stock:
            await self.item_service.decrease_item_stock(item, quantity, self.db_session)
        
        # Refresh the new_order to load the associated order_items and their item details
        await self.db_session.refresh(new_order, attribute_names=['order_items'])
        # For nested relationships like item inside order_items, you might need another refresh or manual loading
        # The 'eager_load' in get_multi handles this, but for a single create, manual refresh might be less efficient.
        # A simpler approach is to return the ID and let the client fetch with get_order_by_id.
        # Or, manually populate item details for each order_item in the response schema.
        for order_item in new_order.order_items:
            await self.db_session.refresh(order_item, attribute_names=['item']) # Refresh each order_item to get 'item'

        logger.info(f"Order {new_order.id} created successfully for user {current_user.id} with total {total_amount}.")
        return new_order


    async def update_order_status(self, order_id: int, order_in: OrderUpdate, current_user: User) -> Order:
        """
        Updates the status of an existing order.
        Only admins can update order status.
        :param order_id: The ID of the order to update.
        :param order_in: Pydantic model containing order update data (new status).
        :param current_user: The authenticated User object.
        :return: The updated Order database object.
        :raises HTTPException: If order not found, or user is not authorized.
        """
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update order status")

        db_order = await order_crud.get(self.db_session, order_id)
        if not db_order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        if order_in.status:
            update_data = order_in.model_dump(exclude_unset=True)
            updated_order = await order_crud.update(self.db_session, db_order, update_data)
            logger.info(f"Order {updated_order.id} status updated to {updated_order.status} by admin {current_user.id}.")
            return updated_order
        
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No status provided for update")

    async def cancel_order(self, order_id: int, current_user: User) -> Order:
        """
        Cancels an order.
        Users can cancel their own pending/processing orders. Admins can cancel any order.
        Stock is returned for cancelled orders.
        :param order_id: The ID of the order to cancel.
        :param current_user: The authenticated User object.
        :return: The cancelled Order database object.
        :raises HTTPException: If order not found, not authorized, or already processed/shipped.
        """
        db_order = await order_crud.get(self.db_session, order_id)
        if not db_order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
        if db_order.user_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this order")

        if db_order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Order cannot be cancelled in '{db_order.status}' status.")
        
        # Get order items to return stock
        order_items_stmt = await self.db_session.execute(
            selectinload(OrderItem.item).where(OrderItem.order_id == order_id)
        )
        order_items: List[OrderItem] = order_items_stmt.scalars().unique().all()

        for order_item in order_items:
            await self.item_service.increase_item_stock(order_item.item, order_item.quantity, self.db_session)

        # Update order status to CANCELLED
        updated_order = await order_crud.update(self.db_session, db_order, {"status": OrderStatus.CANCELLED})
        
        logger.info(f"Order {updated_order.id} cancelled by user {current_user.id}. Stock returned.")
        return updated_order
```