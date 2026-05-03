```python
"""
API endpoints for managing products.

This module defines CRUD operations for products, including listing, retrieving,
creating, updating, and deleting products. It integrates with the `product_service`
for business logic and ensures appropriate authorization.
"""

import logging
from typing import List, Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi_cache.decorator import cache

from app.schemas.product import ProductCreate, ProductUpdate, ProductRead
from app.services import product_service
from app.core.security import get_current_active_user, get_current_active_admin
from app.schemas.user import UserRead
from app.core.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/products",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Creates a new product. Requires admin privileges."
)
@RateLimiter(times=5, seconds=60) # Allow 5 product creations per minute from an IP
async def create_product(
    product_in: ProductCreate,
    current_admin: Annotated[UserRead, Depends(get_current_active_admin)]
):
    """
    Creates a new product in the database.

    Args:
        product_in (ProductCreate): The product data to create.
        current_admin (UserRead): The authenticated admin user (dependency injection).

    Returns:
        ProductRead: The newly created product's details.

    Raises:
        HTTPException: If the product creation fails or if the user is not an admin.
    """
    logger.info(f"Admin {current_admin.email} attempting to create product: {product_in.name}")
    product = await product_service.create_product(product_in)
    logger.info(f"Product '{product.name}' created by admin {current_admin.email}.")
    return product

@router.get(
    "/products",
    response_model=List[ProductRead],
    summary="List all products",
    description="Retrieves a list of all available products, with pagination and search options. Caches results.",
)
@cache(expire=60) # Cache product listings for 60 seconds
@RateLimiter(times=20, seconds=60) # Allow 20 product list requests per minute from an IP
async def read_products(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of items to return"),
    search: Optional[str] = Query(None, description="Search term for product name or description"),
    current_user: Annotated[UserRead, Depends(get_current_active_user)] = None # Optional auth for caching benefits
):
    """
    Retrieves a paginated list of products, optionally filtered by a search term.

    Args:
        skip (int): The number of records to skip for pagination.
        limit (int): The maximum number of records to return.
        search (Optional[str]): A search string to filter products by name or description.
        current_user (UserRead): Optional authenticated user.

    Returns:
        List[ProductRead]: A list of product details.
    """
    logger.info(f"Fetching products with skip={skip}, limit={limit}, search='{search}'.")
    products = await product_service.get_products(skip=skip, limit=limit, search=search)
    logger.debug(f"Returned {len(products)} products.")
    return products

@router.get(
    "/products/{product_id}",
    response_model=ProductRead,
    summary="Get product by ID",
    description="Retrieves a single product by its unique ID. Caches results."
)
@cache(expire=30) # Cache single product details for 30 seconds
@RateLimiter(times=10, seconds=60) # Allow 10 product detail requests per minute from an IP
async def read_product(
    product_id: int,
    current_user: Annotated[UserRead, Depends(get_current_active_user)] = None # Optional auth for caching benefits
):
    """
    Retrieves a single product by its ID.

    Args:
        product_id (int): The ID of the product to retrieve.
        current_user (UserRead): Optional authenticated user.

    Returns:
        ProductRead: The product's details.

    Raises:
        HTTPException: If the product is not found.
    """
    logger.info(f"Fetching product with ID: {product_id}")
    product = await product_service.get_product_by_id(product_id)
    if not product:
        logger.warning(f"Product with ID {product_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    logger.debug(f"Product {product_id} retrieved: {product.name}.")
    return product

@router.put(
    "/products/{product_id}",
    response_model=ProductRead,
    summary="Update a product",
    description="Updates an existing product. Requires admin privileges."
)
@RateLimiter(times=5, seconds=60) # Allow 5 product updates per minute from an IP
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    current_admin: Annotated[UserRead, Depends(get_current_active_admin)]
):
    """
    Updates an existing product in the database.

    Args:
        product_id (int): The ID of the product to update.
        product_in (ProductUpdate): The updated product data.
        current_admin (UserRead): The authenticated admin user (dependency injection).

    Returns:
        ProductRead: The updated product's details.

    Raises:
        HTTPException: If the product is not found or if the user is not an admin.
    """
    logger.info(f"Admin {current_admin.email} attempting to update product ID: {product_id}")
    product = await product_service.get_product_by_id(product_id)
    if not product:
        logger.warning(f"Product with ID {product_id} not found for update.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    updated_product = await product_service.update_product(product_id, product_in)
    logger.info(f"Product ID {product_id} updated by admin {current_admin.email}.")
    return updated_product

@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
    description="Deletes a product by ID. Requires admin privileges."
)
@RateLimiter(times=2, seconds=300) # Allow 2 product deletions per 5 minutes from an IP
async def delete_product(
    product_id: int,
    current_admin: Annotated[UserRead, Depends(get_current_active_admin)]
):
    """
    Deletes a product from the database.

    Args:
        product_id (int): The ID of the product to delete.
        current_admin (UserRead): The authenticated admin user (dependency injection).

    Raises:
        HTTPException: If the product is not found or if the user is not an admin.
    """
    logger.info(f"Admin {current_admin.email} attempting to delete product ID: {product_id}")
    product = await product_service.get_product_by_id(product_id)
    if not product:
        logger.warning(f"Product with ID {product_id} not found for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    await product_service.delete_product(product_id)
    logger.info(f"Product ID {product_id} deleted by admin {current_admin.email}.")
    # No content to return on successful deletion
    return

```