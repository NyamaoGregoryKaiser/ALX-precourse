```python
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.crud_category import crud_category
from app.schemas.category import CategoryCreate, CategoryUpdate

@pytest.mark.asyncio
async def test_create_category_success(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    category_data = CategoryCreate(name="New Category", type="expense")
    response = await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 201
    created_category = response.json()
    assert created_category["name"] == category_data.name
    assert created_category["type"] == category_data.type
    assert created_category["owner_id"] == user_obj.id

    # Verify in DB
    category_in_db = await crud_category.get(db_session, id=created_category["id"])
    assert category_in_db is not None
    assert category_in_db.name == category_data.name

@pytest.mark.asyncio
async def test_create_category_duplicate_name(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    category_data = CategoryCreate(name="Duplicate Category", type="expense")
    
    # First creation
    await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )

    # Second creation with same name for same user
    response = await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 409
    assert "A category with this name already exists for you." in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_categories_success(client: AsyncClient, db_session, test_user, superuser):
    user_obj, user_token = test_user
    superuser_obj, superuser_token = superuser

    # Create some categories for test_user
    await client.post(f"{settings.API_V1_STR}/categories/", json={"name": "Food Expenses", "type": "expense"}, headers={"Authorization": f"Bearer {user_token}"})
    await client.post(f"{settings.API_V1_STR}/categories/", json={"name": "Monthly Income", "type": "income"}, headers={"Authorization": f"Bearer {user_token}"})
    
    # Create a category for superuser to ensure isolation
    await client.post(f"{settings.API_V1_STR}/categories/", json={"name": "Admin Income", "type": "income"}, headers={"Authorization": f"Bearer {superuser_token}"})

    response = await client.get(
        f"{settings.API_V1_STR}/categories/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) >= 2 # Should include Food Expenses and Monthly Income, possibly others from init_db for this user
    assert all(c["owner_id"] == user_obj.id for c in categories)

    # Test filter by type
    response_expense = await client.get(
        f"{settings.API_V1_STR}/categories/?category_type=expense",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response_expense.status_code == 200
    expense_categories = response_expense.json()
    assert all(c["type"] == "expense" for c in expense_categories)
    assert any(c["name"] == "Food Expenses" for c in expense_categories)

@pytest.mark.asyncio
async def test_read_category_by_id_success(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    category_data = CategoryCreate(name="Specific Category", type="expense")
    create_response = await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    category_id = create_response.json()["id"]

    response = await client.get(
        f"{settings.API_V1_STR}/categories/{category_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == category_id
    assert response.json()["name"] == category_data.name

@pytest.mark.asyncio
async def test_read_category_by_id_not_found(client: AsyncClient, test_user):
    _, user_token = test_user
    response = await client.get(
        f"{settings.API_V1_STR}/categories/9999",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 404
    assert "Category not found" in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_category_by_id_not_owner(client: AsyncClient, db_session, test_user, superuser):
    user_obj, user_token = test_user
    superuser_obj, superuser_token = superuser

    # Superuser creates a category
    category_data = CategoryCreate(name="Admin Category", type="expense")
    create_response = await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {superuser_token}"}
    )
    admin_category_id = create_response.json()["id"]

    # Test user tries to access admin's category
    response = await client.get(
        f"{settings.API_V1_STR}/categories/{admin_category_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 404
    assert "Category not found or you don't have permission" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_category_success(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    category_data = CategoryCreate(name="Original Name", type="expense")
    create_response = await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    category_id = create_response.json()["id"]

    update_data = CategoryUpdate(name="Updated Name", type="income")
    response = await client.put(
        f"{settings.API_V1_STR}/categories/{category_id}",
        json=update_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    updated_category = response.json()
    assert updated_category["id"] == category_id
    assert updated_category["name"] == update_data.name
    assert updated_category["type"] == update_data.type

    # Verify in DB
    category_in_db = await crud_category.get(db_session, id=category_id)
    assert category_in_db.name == update_data.name
    assert category_in_db.type == update_data.type

@pytest.mark.asyncio
async def test_update_category_duplicate_name(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    cat1_data = CategoryCreate(name="Category A", type="expense")
    cat2_data = CategoryCreate(name="Category B", type="expense")
    
    create_response1 = await client.post(f"{settings.API_V1_STR}/categories/", json=cat1_data.model_dump(), headers={"Authorization": f"Bearer {user_token}"})
    create_response2 = await client.post(f"{settings.API_V1_STR}/categories/", json=cat2_data.model_dump(), headers={"Authorization": f"Bearer {user_token}"})
    
    cat1_id = create_response1.json()["id"]
    
    # Try to update Category A's name to Category B's name
    update_data = CategoryUpdate(name=cat2_data.name)
    response = await client.put(
        f"{settings.API_V1_STR}/categories/{cat1_id}",
        json=update_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 409
    assert "A category with this new name already exists for you." in response.json()["detail"]

@pytest.mark.asyncio
async def test_delete_category_success(client: AsyncClient, db_session, test_user):
    user_obj, user_token = test_user
    category_data = CategoryCreate(name="Category to Delete", type="expense")
    create_response = await client.post(
        f"{settings.API_V1_STR}/categories/",
        json=category_data.model_dump(),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    category_id = create_response.json()["id"]

    response = await client.delete(
        f"{settings.API_V1_STR}/categories/{category_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Category deleted successfully"

    # Verify in DB
    category_in_db = await crud_category.get(db_session, id=category_id)
    assert category_in_db is None

@pytest.mark.asyncio
async def test_delete_category_not_found(client: AsyncClient, test_user):
    _, user_token = test_user
    response = await client.delete(
        f"{settings.API_V1_STR}/categories/9999",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 404
    assert "Category not found" in response.json()["detail"]

```