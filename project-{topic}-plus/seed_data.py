```python
"""
Script to seed the ALX-Shop database with initial data.

This includes:
- Creating a default administrator account.
- Creating a few sample customer accounts.
- Adding some sample products.

It uses the application's service layer to ensure data consistency and hashing.
"""

import asyncio
import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import database_engine, AsyncSessionLocal, close_db_connection
from app.core.config import settings
from app.models.base import Base # Import Base to create tables
from app.models.user import User, UserRole # Import ORM models
from app.models.product import Product
from app.schemas.user import UserCreate
from app.schemas.product import ProductCreate
from app.services.auth_service import register_new_user # Use service for user creation
from app.services.product_service import create_product
from app.services.user_service import get_user_by_email # Check for existing users

logging.basicConfig(level=settings.LOG_LEVEL, format=settings.LOG_FORMAT)
logger = logging.getLogger(__name__)

async def create_tables_if_not_exist():
    """
    Creates all database tables defined in the Base metadata, if they don't already exist.
    This is an alternative to Alembic for initial setup or in development.
    For production, Alembic migrations are preferred.
    """
    logger.info("Attempting to create database tables if they don't exist...")
    async with database_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables creation process completed.")

async def seed_data():
    """
    Main function to populate the database with seed data.
    """
    logger.info("Starting database seeding process...")

    # Ensure tables exist (optional, if Alembic is not used for initial setup)
    # await create_tables_if_not_exist()

    async with AsyncSessionLocal() as db:
        # 1. Create Default Admin User
        admin_user_data = UserCreate(
            email=settings.DEFAULT_ADMIN_EMAIL,
            password=settings.DEFAULT_ADMIN_PASSWORD,
            full_name=settings.DEFAULT_ADMIN_FULL_NAME,
            role=UserRole.ADMIN,
            is_active=True
        )
        existing_admin = await get_user_by_email(admin_user_data.email, db=db)
        if not existing_admin:
            logger.info(f"Creating default admin user: {admin_user_data.email}")
            await register_new_user(admin_user_data, db=db)
        else:
            logger.info(f"Admin user {admin_user_data.email} already exists. Skipping creation.")

        # 2. Create Sample Customer Users
        customer_users_data: List[UserCreate] = [
            UserCreate(email="customer1@alx.com", password="password123", full_name="Alice Smith", role=UserRole.CUSTOMER),
            UserCreate(email="customer2@alx.com", password="password123", full_name="Bob Johnson", role=UserRole.CUSTOMER),
            UserCreate(email="customer3@alx.com", password="password123", full_name="Charlie Brown", role=UserRole.CUSTOMER, is_active=False), # Inactive user
        ]

        for user_data in customer_users_data:
            existing_user = await get_user_by_email(user_data.email, db=db)
            if not existing_user:
                logger.info(f"Creating customer user: {user_data.email}")
                await register_new_user(user_data, db=db)
            else:
                logger.info(f"Customer user {user_data.email} already exists. Skipping creation.")

        # 3. Create Sample Products
        products_data: List[ProductCreate] = [
            ProductCreate(name="Laptop Pro", description="High performance laptop for professionals.", price=1200.00, stock=50, is_active=True),
            ProductCreate(name="Wireless Mouse", description="Ergonomic wireless mouse with long battery life.", price=25.50, stock=200, is_active=True),
            ProductCreate(name="Mechanical Keyboard", description="RGB mechanical keyboard with clicky switches.", price=80.00, stock=75, is_active=True),
            ProductCreate(name="USB-C Hub", description="7-in-1 USB-C hub with HDMI, USB, and SD card readers.", price=40.00, stock=150, is_active=True),
            ProductCreate(name="Gaming Monitor", description="27-inch 144Hz QHD gaming monitor.", price=350.00, stock=30, is_active=True),
            ProductCreate(name="Old Model Phone", description="An older model smartphone, no longer actively sold.", price=99.99, stock=5, is_active=False), # Inactive product
        ]

        for product_data in products_data:
            # Simple check if product exists by name (can be improved with unique constraint)
            result = await db.execute(select(Product).filter(Product.name == product_data.name))
            existing_product = result.scalar_one_or_none()
            if not existing_product:
                logger.info(f"Creating product: {product_data.name}")
                await create_product(product_data, db=db)
            else:
                logger.info(f"Product '{product_data.name}' already exists. Skipping creation.")

    logger.info("Database seeding process completed.")

if __name__ == "__main__":
    # Ensure database_engine is set up correctly in app.core.database for this script
    async def main_seed():
        try:
            await seed_data()
        finally:
            await close_db_connection(database_engine) # Ensure connections are closed

    asyncio.run(main_seed())

```