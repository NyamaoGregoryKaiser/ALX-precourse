```python
"""
Integration tests for the Product API endpoints.

These tests cover:
- CRUD operations for products (`/api/v1/products`).
- Authorization checks for product management (admin vs. regular user).
- Pagination and search for product listings.
- Caching behavior for product retrieval.
"""

import pytest
from httpx import AsyncClient
from fastapi import status
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead
from app.schemas.user import UserRead, UserRole
from app.services import product_service
from app.core.config import settings
from app.core.database import AsyncSessionLocal # For directly adding products if needed in setup
import asyncio
import time

@pytest.fixture(scope="function")
async def seed_products(test_db):
    """Fixture to seed some products for testing."""
    async with AsyncSessionLocal() as session:
        product1 = await product_service.create_product(ProductCreate(name="Test Product 1", description="Desc 1", price=10.00, stock=10), db=session)
        product2 = await product_service.create_product(ProductCreate(name="Test Product 2", description="Another product", price=20.00, stock=5), db=session)
        product3 = await product_service.create_product(ProductCreate(name="Search Term Item", description="Contains search term", price=30.00, stock=20), db=session)
        product4 = await product_service.create_product(ProductCreate(name="Inactive Product", description="Not available", price=50.00, stock=1, is_active=False), db=session)
        await session.commit()
        return [product1, product2, product3, product4]

# --- Create Product Tests ---

@pytest.mark.asyncio
async def test_create_product_success(async_client: AsyncClient, admin_auth_headers: dict):
    """Test successful product creation by an admin."""
    product_data = ProductCreate(
        name="New Gadget",
        description="A cool new gadget.",
        price=99.99,
        stock=50
    )
    response = await async_client.post("/api/v1/products", json=product_data.model_dump(), headers=admin_auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    product = ProductRead.model_validate(response.json())
    assert product.name == product_data.name
    assert product.price == product_data.price
    assert product.stock == product_data.stock
    assert product.is_active is True
    assert product.id is not None

@pytest.mark.asyncio
async def test_create_product_unauthorized(async_client: AsyncClient, customer_auth_headers: dict):
    """Test product creation by a regular user (should fail)."""
    product_data = ProductCreate(name="Unauthorized Item", description="Should not be created.", price=1.00, stock=1)
    response = await async_client.post("/api/v1/products", json=product_data.model_dump(), headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "administrative privileges" in response.json()["message"]

@pytest.mark.asyncio
async def test_create_product_unauthenticated(async_client: AsyncClient):
    """Test product creation without any authentication (should fail)."""
    product_data = ProductCreate(name="Unauthenticated Item", description="Should not be created.", price=1.00, stock=1)
    response = await async_client.post("/api/v1/products", json=product_data.model_dump())
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Not authenticated" in response.json()["message"]

# --- Read Products Tests ---

@pytest.mark.asyncio
async def test_read_products_list_all(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test retrieving a list of all active products."""
    response = await async_client.get("/api/v1/products", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    products = [ProductRead.model_validate(p) for p in response.json()]
    assert len(products) >= 3 # Expect at least 3 active products from seed_products
    assert any(p.name == "Test Product 1" for p in products)
    assert not any(p.name == "Inactive Product" for p in products) # Inactive products should not be listed

@pytest.mark.asyncio
async def test_read_products_pagination(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test pagination for product listings."""
    # Assume at least 3 active products for this test to be meaningful
    response = await async_client.get("/api/v1/products?limit=1&skip=0", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    products = response.json()
    assert len(products) == 1

    response = await async_client.get("/api/v1/products?limit=1&skip=1", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    products_skip_1 = response.json()
    assert len(products_skip_1) == 1
    assert products[0]["id"] != products_skip_1[0]["id"]

@pytest.mark.asyncio
async def test_read_products_search(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test searching products by name or description."""
    response = await async_client.get("/api/v1/products?search=Test Product 1", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    products = response.json()
    assert len(products) == 1
    assert products[0]["name"] == "Test Product 1"

    response = await async_client.get("/api/v1/products?search=Another", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    products = response.json()
    assert len(products) == 1
    assert products[0]["name"] == "Test Product 2"

@pytest.mark.asyncio
async def test_read_product_by_id_success(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test retrieving a single product by ID."""
    product_id = seed_products[0].id
    response = await async_client.get(f"/api/v1/products/{product_id}", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    product = ProductRead.model_validate(response.json())
    assert product.id == product_id
    assert product.name == seed_products[0].name

@pytest.mark.asyncio
async def test_read_product_by_id_not_found(async_client: AsyncClient, customer_auth_headers: dict):
    """Test retrieving a non-existent product."""
    response = await async_client.get("/api/v1/products/9999", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Product not found" in response.json()["message"]

@pytest.mark.asyncio
async def test_product_listing_caching(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test if product listing endpoint is cached."""
    # First request - should hit DB and set cache
    start_time = time.time()
    response1 = await async_client.get("/api/v1/products", headers=customer_auth_headers)
    duration1 = time.time() - start_time
    assert response1.status_code == status.HTTP_200_OK

    # Immediately subsequent request - should hit cache (faster)
    start_time = time.time()
    response2 = await async_client.get("/api/v1/products", headers=customer_auth_headers)
    duration2 = time.time() - start_time
    assert response2.status_code == status.HTTP_200_OK
    assert response1.json() == response2.json()
    # Expect second request to be significantly faster, though precise timing is hard in tests
    # This is a heuristic, actual speedup depends on test environment.
    assert duration2 < duration1 # Cache hit should be faster

@pytest.mark.asyncio
async def test_single_product_caching(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test if single product retrieval endpoint is cached."""
    product_id = seed_products[0].id

    # First request
    start_time = time.time()
    response1 = await async_client.get(f"/api/v1/products/{product_id}", headers=customer_auth_headers)
    duration1 = time.time() - start_time
    assert response1.status_code == status.HTTP_200_OK

    # Second request
    start_time = time.time()
    response2 = await async_client.get(f"/api/v1/products/{product_id}", headers=customer_auth_headers)
    duration2 = time.time() - start_time
    assert response2.status_code == status.HTTP_200_OK
    assert response1.json() == response2.json()
    assert duration2 < duration1 # Cache hit should be faster

# --- Update Product Tests ---

@pytest.mark.asyncio
async def test_update_product_success(async_client: AsyncClient, seed_products, admin_auth_headers: dict):
    """Test successful product update by an admin."""
    product_id = seed_products[0].id
    update_data = ProductUpdate(price=12.50, stock=8)
    response = await async_client.put(f"/api/v1/products/{product_id}", json=update_data.model_dump(), headers=admin_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    product = ProductRead.model_validate(response.json())
    assert product.id == product_id
    assert product.price == update_data.price
    assert product.stock == update_data.stock

    # Verify update in DB
    check_response = await async_client.get(f"/api/v1/products/{product_id}", headers=admin_auth_headers)
    assert check_response.json()["price"] == update_data.price

@pytest.mark.asyncio
async def test_update_product_unauthorized(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test product update by a regular user (should fail)."""
    product_id = seed_products[0].id
    update_data = ProductUpdate(price=15.00)
    response = await async_client.put(f"/api/v1/products/{product_id}", json=update_data.model_dump(), headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "administrative privileges" in response.json()["message"]

@pytest.mark.asyncio
async def test_update_product_not_found(async_client: AsyncClient, admin_auth_headers: dict):
    """Test updating a non-existent product."""
    update_data = ProductUpdate(price=100.00)
    response = await async_client.put("/api/v1/products/9999", json=update_data.model_dump(), headers=admin_auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Product not found" in response.json()["message"]

# --- Delete Product Tests ---

@pytest.mark.asyncio
async def test_delete_product_success(async_client: AsyncClient, seed_products, admin_auth_headers: dict):
    """Test successful product deletion by an admin."""
    product_id = seed_products[1].id # Delete second product
    response = await async_client.delete(f"/api/v1/products/{product_id}", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify deletion in DB
    check_response = await async_client.get(f"/api/v1/products/{product_id}", headers=admin_auth_headers)
    assert check_response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.asyncio
async def test_delete_product_unauthorized(async_client: AsyncClient, seed_products, customer_auth_headers: dict):
    """Test product deletion by a regular user (should fail)."""
    product_id = seed_products[0].id
    response = await async_client.delete(f"/api/v1/products/{product_id}", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "administrative privileges" in response.json()["message"]

@pytest.mark.asyncio
async def test_delete_product_not_found(async_client: AsyncClient, admin_auth_headers: dict):
    """Test deleting a non-existent product."""
    response = await async_client.delete("/api/v1/products/9999", headers=admin_auth_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Product not found" in response.json()["message"]

@pytest.mark.asyncio
async def test_product_rate_limiting(async_client: AsyncClient, customer_auth_headers: dict):
    """Test if /products endpoint applies rate limiting."""
    # The /products GET endpoint has a limit of 20 requests per minute
    for i in range(20):
        response = await async_client.get("/api/v1/products", headers=customer_auth_headers)
        assert response.status_code == status.HTTP_200_OK

    # The 21st request should be rate-limited
    response = await async_client.get("/api/v1/products", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Rate limit exceeded" in response.json()["message"]
    assert "Retry-After" in response.headers

    # Wait for the limit to reset and try again
    time.sleep(60)
    response = await async_client.get("/api/v1/products", headers=customer_auth_headers)
    assert response.status_code == status.HTTP_200_OK # Should succeed after reset

```