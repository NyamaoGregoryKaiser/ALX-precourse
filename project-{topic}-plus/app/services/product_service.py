```python
"""
Product service module for ALX-Shop.

This module encapsulates the business logic for managing products, including:
- CRUD operations for products.
- Querying products by various criteria (e.g., search, pagination).
- Updating product stock.
- Interacting with the database via SQLAlchemy.
"""

import logging
from typing import List, Optional, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db_session
from app.models.product import Product # Import the SQLAlchemy ORM model
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead

logger = logging.getLogger(__name__)

async def get_product_by_id(product_id: int, db: AsyncSession = Depends(get_db_session)) -> Optional[ProductRead]:
    """
    Retrieves a product by its ID.

    Args:
        product_id (int): The ID of the product to retrieve.
        db (AsyncSession): The database session.

    Returns:
        Optional[ProductRead]: The product's data if found, else None.
    """
    logger.debug(f"Fetching product with ID: {product_id}")
    result = await db.execute(select(Product).filter(Product.id == product_id))
    product_orm = result.scalar_one_or_none()
    if product_orm:
        logger.debug(f"Found product: {product_orm.name}")
        return ProductRead.model_validate(product_orm)
    logger.debug(f"Product with ID {product_id} not found.")
    return None

async def get_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session)
) -> List[ProductRead]:
    """
    Retrieves a paginated list of products, with optional search functionality.

    Args:
        skip (int): The number of records to skip.
        limit (int): The maximum number of records to return.
        search (Optional[str]): A search term to filter products by name or description.
        db (AsyncSession): The database session.

    Returns:
        List[ProductRead]: A list of product data.
    """
    logger.debug(f"Fetching products with skip={skip}, limit={limit}, search='{search}'")
    query = select(Product).filter(Product.is_active == True) # Only active products for general listing
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(Product.name).like(search_pattern)) |
            (func.lower(Product.description).like(search_pattern))
        )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    products_orm = result.scalars().all()
    logger.debug(f"Retrieved {len(products_orm)} products.")
    return [ProductRead.model_validate(product) for product in products_orm]

async def create_product(product_in: ProductCreate, db: AsyncSession = Depends(get_db_session)) -> ProductRead:
    """
    Creates a new product in the database.

    Args:
        product_in (ProductCreate): The Pydantic model with product data.
        db (AsyncSession): The database session.

    Returns:
        ProductRead: The newly created product's data.
    """
    logger.info(f"Creating product: {product_in.name}")
    db_product = Product(**product_in.model_dump())
    db.add(db_product)
    await db.flush()
    await db.refresh(db_product)
    logger.info(f"Product '{db_product.name}' created successfully with ID: {db_product.id}")
    return ProductRead.model_validate(db_product)

async def update_product(product_id: int, product_in: ProductUpdate, db: AsyncSession = Depends(get_db_session)) -> Optional[ProductRead]:
    """
    Updates an existing product's details.

    Args:
        product_id (int): The ID of the product to update.
        product_in (ProductUpdate): The Pydantic model with updated product data.
        db (AsyncSession): The database session.

    Returns:
        Optional[ProductRead]: The updated product's data if found and updated, else None.
    """
    logger.info(f"Updating product with ID: {product_id}")
    result = await db.execute(select(Product).filter(Product.id == product_id))
    db_product = result.scalar_one_or_none()

    if not db_product:
        logger.warning(f"Product with ID {product_id} not found for update.")
        return None

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)

    db.add(db_product)
    await db.flush()
    await db.refresh(db_product)
    logger.info(f"Product {product_id} updated successfully.")
    return ProductRead.model_validate(db_product)

async def update_product_stock(product_id: int, quantity_change: int, db: AsyncSession = Depends(get_db_session)) -> Optional[ProductRead]:
    """
    Updates the stock of a product.
    Can be used to decrement (negative quantity_change) or increment (positive quantity_change) stock.

    Args:
        product_id (int): The ID of the product to update.
        quantity_change (int): The amount to add to the current stock (can be negative for reduction).
        db (AsyncSession): The database session.

    Returns:
        Optional[ProductRead]: The updated product's data if found and updated, else None.

    Raises:
        ValueError: If the stock would become negative.
    """
    logger.info(f"Updating stock for product ID {product_id} by {quantity_change}.")
    result = await db.execute(select(Product).filter(Product.id == product_id))
    db_product = result.scalar_one_or_none()

    if not db_product:
        logger.warning(f"Product with ID {product_id} not found for stock update.")
        return None

    new_stock = db_product.stock + quantity_change
    if new_stock < 0:
        logger.error(f"Cannot update stock for product {product_id}: resulting stock would be {new_stock}. Current stock: {db_product.stock}, change: {quantity_change}.")
        raise ValueError(f"Not enough stock for product {db_product.name}. Current: {db_product.stock}, trying to reduce by {-quantity_change}.")

    db_product.stock = new_stock
    db.add(db_product)
    await db.flush()
    await db.refresh(db_product)
    logger.info(f"Stock for product {product_id} updated to {db_product.stock}.")
    return ProductRead.model_validate(db_product)


async def delete_product(product_id: int, db: AsyncSession = Depends(get_db_session)) -> bool:
    """
    Deletes a product from the database.

    Args:
        product_id (int): The ID of the product to delete.
        db (AsyncSession): The database session.

    Returns:
        bool: True if the product was deleted, False if not found.
    """
    logger.info(f"Attempting to delete product with ID: {product_id}")
    result = await db.execute(select(Product).filter(Product.id == product_id))
    db_product = result.scalar_one_or_none()

    if not db_product:
        logger.warning(f"Product with ID {product_id} not found for deletion.")
        return False

    await db.delete(db_product)
    # The session commit in `get_db_session` will finalize the deletion
    logger.info(f"Product {product_id} deleted successfully.")
    return True

```