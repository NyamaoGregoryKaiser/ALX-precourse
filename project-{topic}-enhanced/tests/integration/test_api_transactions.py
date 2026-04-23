```python
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.crud_category import crud_category
from app.crud.crud_transaction import crud_transaction
from app.schemas.category import CategoryCreate
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from datetime import datetime, UTC, date

@pytest.fixture
async def user_expense_category(db_session, test_user):
    user_obj, user_token = test_user
    category_in = CategoryCreate(name="Test Expenses", type="expense")
    category = await crud_category.create_with_owner(db_session, obj_in=category_in, owner_id=user_obj.id)
    return category

@pytest.fixture
async def user_income_category(db_session, test_user):
    user_obj, user_token = test_user
    category_in = CategoryCreate(name="Test Income", type="income")
    category = await crud_category.create_with_owner(db_session, obj_in=category_in, owner_id=user_obj.id)
    return category

@pytest.mark.asyncio
async def test_create_transaction_success(client: AsyncClient, db_session, test_user, user_expense_category):
    user_obj, user_token = test_user
    transaction_data = TransactionCreate(
        description="Groceries",
        amount=50.00,
        type="expense",
        category_id=user_expense_category.id,
        transaction_date=datetime.now(UTC)
    )
    response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 201
    created_transaction = response.json()
    assert created_transaction["description"] == transaction_data.description
    assert created_transaction["amount"] == transaction_data.amount
    assert created_transaction["owner_id"] == user_obj.id
    assert created_transaction["category_id"] == user_expense_category.id

    transaction_in_db = await crud_transaction.get(db_session, id=created_transaction["id"])
    assert transaction_in_db is not None
    assert transaction_in_db.description == transaction_data.description

@pytest.mark.asyncio
async def test_create_transaction_invalid_category(client: AsyncClient, test_user):
    _, user_token = test_user
    transaction_data = TransactionCreate(
        description="Invalid Cat Transaction",
        amount=25.00,
        type="expense",
        category_id=9999, # Non-existent category
        transaction_date=datetime.now(UTC)
    )
    response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Category not found or does not belong to you." in response.json()["detail"]

@pytest.mark.asyncio
async def test_create_transaction_mismatched_category_type(client: AsyncClient, test_user, user_expense_category):
    _, user_token = test_user
    transaction_data = TransactionCreate(
        description="Mismatched Type",
        amount=100.00,
        type="income", # Mismatch with user_expense_category
        category_id=user_expense_category.id,
        transaction_date=datetime.now(UTC)
    )
    response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Transaction type 'income' does not match category type 'expense'." in response.json()["detail"]


@pytest.mark.asyncio
async def test_read_transactions_success(client: AsyncClient, db_session, test_user, user_expense_category, user_income_category):
    user_obj, user_token = test_user
    
    # Create some transactions
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Expense 1", amount=10.0, type="expense", category_id=user_expense_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Income 1", amount=100.0, type="income", category_id=user_income_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    
    response = await client.get(
        f"{settings.API_V1_STR}/transactions/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    transactions = response.json()
    assert len(transactions) >= 2
    assert all(t["owner_id"] == user_obj.id for t in transactions)

@pytest.mark.asyncio
async def test_read_transactions_with_category_filter(client: AsyncClient, db_session, test_user, user_expense_category, user_income_category):
    user_obj, user_token = test_user
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Exp 1", amount=10.0, type="expense", category_id=user_expense_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Inc 1", amount=100.0, type="income", category_id=user_income_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    
    response = await client.get(
        f"{settings.API_V1_STR}/transactions/?category_id={user_expense_category.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    transactions = response.json()
    assert len(transactions) >= 1
    assert all(t["category_id"] == user_expense_category.id for t in transactions)
    assert any(t["description"] == "Exp 1" for t in transactions)

@pytest.mark.asyncio
async def test_get_user_balance(client: AsyncClient, db_session, test_user, user_expense_category, user_income_category):
    user_obj, user_token = test_user
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Salary", amount=1000.0, type="income", category_id=user_income_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Rent", amount=300.0, type="expense", category_id=user_expense_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    await client.post(f"{settings.API_V1_STR}/transactions/", json=TransactionCreate(description="Groceries", amount=50.0, type="expense", category_id=user_expense_category.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})

    response = await client.get(
        f"{settings.API_V1_STR}/transactions/balance",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["balance"] == pytest.approx(1000.0 - 300.0 - 50.0)

@pytest.mark.asyncio
async def test_read_transaction_by_id_success(client: AsyncClient, db_session, test_user, user_expense_category):
    user_obj, user_token = test_user
    transaction_data = TransactionCreate(description="Unique Transaction", amount=75.0, type="expense", category_id=user_expense_category.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    transaction_id = create_response.json()["id"]

    response = await client.get(
        f"{settings.API_V1_STR}/transactions/{transaction_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == transaction_id
    assert response.json()["description"] == transaction_data.description

@pytest.mark.asyncio
async def test_read_transaction_by_id_not_found(client: AsyncClient, test_user):
    _, user_token = test_user
    response = await client.get(
        f"{settings.API_V1_STR}/transactions/9999",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 404
    assert "Transaction not found" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_transaction_success(client: AsyncClient, db_session, test_user, user_expense_category, user_income_category):
    user_obj, user_token = test_user
    transaction_data = TransactionCreate(description="Old Description", amount=100.0, type="expense", category_id=user_expense_category.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    transaction_id = create_response.json()["id"]

    update_data = TransactionUpdate(description="New Description", amount=120.0, category_id=user_income_category.id, type="income")
    response = await client.put(
        f"{settings.API_V1_STR}/transactions/{transaction_id}",
        json=update_data.model_dump(mode='json', exclude_unset=True),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    updated_transaction = response.json()
    assert updated_transaction["id"] == transaction_id
    assert updated_transaction["description"] == update_data.description
    assert updated_transaction["amount"] == update_data.amount
    assert updated_transaction["category_id"] == user_income_category.id
    assert updated_transaction["type"] == "income" # Type also updated

    transaction_in_db = await crud_transaction.get(db_session, id=transaction_id)
    assert transaction_in_db.description == update_data.description
    assert transaction_in_db.amount == update_data.amount
    assert transaction_in_db.category_id == user_income_category.id
    assert transaction_in_db.type == "income"

@pytest.mark.asyncio
async def test_update_transaction_category_type_mismatch(client: AsyncClient, db_session, test_user, user_expense_category, user_income_category):
    user_obj, user_token = test_user
    # Create an expense transaction
    transaction_data = TransactionCreate(description="Expense Transaction", amount=50.0, type="expense", category_id=user_expense_category.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    transaction_id = create_response.json()["id"]

    # Try to update its category to an income category WITHOUT changing transaction type
    update_data = TransactionUpdate(category_id=user_income_category.id)
    response = await client.put(
        f"{settings.API_V1_STR}/transactions/{transaction_id}",
        json=update_data.model_dump(mode='json', exclude_unset=True),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Transaction original type 'expense' does not match new category type 'income'." in response.json()["detail"]

    # Now, try to update both category and transaction type to match
    update_data_match = TransactionUpdate(category_id=user_income_category.id, type="income")
    response_match = await client.put(
        f"{settings.API_V1_STR}/transactions/{transaction_id}",
        json=update_data_match.model_dump(mode='json', exclude_unset=True),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response_match.status_code == 200
    assert response_match.json()["category_id"] == user_income_category.id
    assert response_match.json()["type"] == "income"


@pytest.mark.asyncio
async def test_delete_transaction_success(client: AsyncClient, db_session, test_user, user_expense_category):
    user_obj, user_token = test_user
    transaction_data = TransactionCreate(description="Transaction to Delete", amount=15.0, type="expense", category_id=user_expense_category.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/transactions/",
        json=transaction_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    transaction_id = create_response.json()["id"]

    response = await client.delete(
        f"{settings.API_V1_STR}/transactions/{transaction_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Transaction deleted successfully"

    transaction_in_db = await crud_transaction.get(db_session, id=transaction_id)
    assert transaction_in_db is None

```