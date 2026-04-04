import asyncio
import logging
from datetime import datetime, timedelta
import random

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.db.models import User, Item, Order, OrderItem, UserRole, OrderStatus
from app.utils.security import get_password_hash # Import password hashing utility

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def get_test_db_session() -> AsyncSession:
    """
    Returns an async database session for seeding/testing purposes.
    Uses the configured DATABASE_URL.
    """
    engine = create_async_engine(
        settings.ASYNC_DATABASE_URL,
        echo=False,
    )
    AsyncSessionLocal = async_sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with AsyncSessionLocal() as session:
        yield session
    await engine.dispose()

async def seed_data():
    """
    Seeds the database with initial data for Users, Items, and Orders.
    This script should be run after migrations.
    """
    logger.info("Starting database seeding...")

    async for session in get_test_db_session():
        # --- Create Admin User ---
        admin_email = "admin@example.com"
        admin_user_exists = await session.execute(
            User.__table__.select().where(User.email == admin_email)
        )
        if not admin_user_exists.first():
            admin_user = User(
                full_name="Admin User",
                email=admin_email,
                hashed_password=get_password_hash("adminpassword"),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True,
                phone_number="+11234567890",
            )
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)
            logger.info(f"Admin user '{admin_email}' created.")
        else:
            admin_user = (await session.execute(User.__table__.select().where(User.email == admin_email))).scalar_one()
            logger.info(f"Admin user '{admin_email}' already exists.")

        # --- Create Regular Users ---
        users_to_create = []
        for i in range(1, 4):
            user_email = f"user{i}@example.com"
            user_exists = await session.execute(
                User.__table__.select().where(User.email == user_email)
            )
            if not user_exists.first():
                user = User(
                    full_name=f"User {i}",
                    email=user_email,
                    hashed_password=get_password_hash(f"userpassword{i}"),
                    role=UserRole.USER,
                    is_active=True,
                    is_verified=True,
                    phone_number=f"+1111222333{i}",
                )
                users_to_create.append(user)
                logger.info(f"User '{user_email}' added to batch.")
            else:
                logger.info(f"User '{user_email}' already exists.")
        
        if users_to_create:
            session.add_all(users_to_create)
            await session.commit()
            for user in users_to_create:
                await session.refresh(user)
            logger.info(f"{len(users_to_create)} new regular users created.")

        # Fetch all users for item/order assignment
        all_users = (await session.execute(User.__table__.select())).scalars().all()
        regular_users = [u for u in all_users if u.role == UserRole.USER]
        if not regular_users:
            logger.warning("No regular users found to assign items/orders. Skipping item/order seeding.")
            return # Exit if no regular users

        # --- Create Items ---
        items_to_create = []
        item_names = [
            "Smartphone X", "Wireless Earbuds", "Smartwatch Pro",
            "Portable Charger", "Bluetooth Speaker", "Gaming Headset",
            "VR Headset", "Drone Mini", "Action Camera", "E-Reader",
        ]
        existing_items = (await session.execute(Item.__table__.select())).scalars().all()
        existing_item_names = {item.name for item in existing_items}

        for i, name in enumerate(item_names):
            if name not in existing_item_names:
                owner = random.choice(regular_users)
                item = Item(
                    name=name,
                    description=f"High-quality {name} with advanced features.",
                    price=round(random.uniform(20.0, 1000.0), 2),
                    stock_quantity=random.randint(10, 200),
                    is_active=True,
                    owner_id=owner.id,
                )
                items_to_create.append(item)
                logger.info(f"Item '{name}' added to batch.")
            else:
                logger.info(f"Item '{name}' already exists.")
        
        if items_to_create:
            session.add_all(items_to_create)
            await session.commit()
            for item in items_to_create:
                await session.refresh(item)
            logger.info(f"{len(items_to_create)} new items created.")
        
        all_items = (await session.execute(Item.__table__.select())).scalars().all()
        if not all_items:
            logger.warning("No items found. Skipping order seeding.")
            return

        # --- Create Orders ---
        orders_to_create = []
        for user in regular_users:
            num_orders = random.randint(1, 3) # Each user places 1-3 orders
            for _ in range(num_orders):
                num_order_items = random.randint(1, min(3, len(all_items))) # 1-3 unique items per order
                selected_items = random.sample(all_items, num_order_items)
                
                order_items_data = []
                total_amount = 0.0
                for item in selected_items:
                    quantity = random.randint(1, 5)
                    price_at_order = item.price
                    order_items_data.append(OrderItem(
                        item_id=item.id,
                        quantity=quantity,
                        price_at_order=price_at_order,
                    ))
                    total_amount += price_at_order * quantity
                
                # Check if an identical order already exists (simple heuristic)
                order_exists = False
                existing_orders = await session.execute(
                    Order.__table__.select().where(Order.user_id == user.id, Order.total_amount == total_amount)
                )
                if existing_orders.first():
                    order_exists = True # Simplistic check, real check would be more complex

                if not order_exists:
                    order = Order(
                        user_id=user.id,
                        total_amount=round(total_amount, 2),
                        status=random.choice(list(OrderStatus)),
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                    )
                    orders_to_create.append((order, order_items_data))
                    logger.info(f"Order for user {user.email} (total: {order.total_amount}) added to batch.")
                else:
                    logger.info(f"Similar order for user {user.email} already exists. Skipping.")

        if orders_to_create:
            for order, order_items_data in orders_to_create:
                session.add(order)
                await session.flush() # Flush to get order ID for order_items
                for oi in order_items_data:
                    oi.order_id = order.id
                    session.add(oi)
            await session.commit()
            for order, _ in orders_to_create:
                await session.refresh(order)
            logger.info(f"{len(orders_to_create)} new orders created.")

    logger.info("Database seeding complete.")

if __name__ == "__main__":
    # Ensure this script is run within an environment where .env variables are loaded
    # or DATABASE_URL is set.
    asyncio.run(seed_data())
```