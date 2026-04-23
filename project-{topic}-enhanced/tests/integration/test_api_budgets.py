```python
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.crud.crud_category import crud_category
from app.crud.crud_budget import crud_budget
from app.crud.crud_transaction import crud_transaction
from app.schemas.category import CategoryCreate
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.schemas.transaction import TransactionCreate
from datetime import date, timedelta, datetime, UTC

@pytest.fixture
async def user_expense_category_budget(db_session, test_user):
    user_obj, user_token = test_user
    category_in = CategoryCreate(name="Budget Expenses", type="expense")
    category = await crud_category.create_with_owner(db_session, obj_in=category_in, owner_id=user_obj.id)
    return category

@pytest.fixture
async def user_income_category_budget(db_session, test_user):
    user_obj, user_token = test_user
    category_in = CategoryCreate(name="Budget Income", type="income")
    category = await crud_category.create_with_owner(db_session, obj_in=category_in, owner_id=user_obj.id)
    return category

@pytest.mark.asyncio
async def test_create_budget_success(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    budget_data = BudgetCreate(
        amount=500.00,
        start_date=today,
        end_date=today + timedelta(days=30),
        category_id=user_expense_category_budget.id
    )
    response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 201
    created_budget = response.json()
    assert created_budget["amount"] == budget_data.amount
    assert created_budget["owner_id"] == user_obj.id
    assert created_budget["category_id"] == user_expense_category_budget.id

    budget_in_db = await crud_budget.get(db_session, id=created_budget["id"])
    assert budget_in_db is not None
    assert budget_in_db.amount == budget_data.amount

@pytest.mark.asyncio
async def test_create_budget_invalid_dates(client: AsyncClient, test_user, user_expense_category_budget):
    _, user_token = test_user
    today = date.today()
    budget_data = BudgetCreate(
        amount=500.00,
        start_date=today + timedelta(days=30),
        end_date=today, # End date before start date
        category_id=user_expense_category_budget.id
    )
    response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Start date must be before end date." in response.json()["detail"]

@pytest.mark.asyncio
async def test_create_budget_income_category(client: AsyncClient, test_user, user_income_category_budget):
    _, user_token = test_user
    today = date.today()
    budget_data = BudgetCreate(
        amount=500.00,
        start_date=today,
        end_date=today + timedelta(days=30),
        category_id=user_income_category_budget.id
    )
    response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Budgets can only be set for 'expense' categories." in response.json()["detail"]

@pytest.mark.asyncio
async def test_create_budget_overlapping_period(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    start = today
    end = today + timedelta(days=30)
    
    budget_data_1 = BudgetCreate(amount=500.00, start_date=start, end_date=end, category_id=user_expense_category_budget.id)
    await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data_1.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )

    budget_data_2 = BudgetCreate(amount=600.00, start_date=start, end_date=end, category_id=user_expense_category_budget.id)
    response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data_2.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 409
    assert "A budget for this category already exists for the specified period." in response.json()["detail"]

@pytest.mark.asyncio
async def test_read_budgets_success(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    # Create an active budget
    await client.post(f"{settings.API_V1_STR}/budgets/", json=BudgetCreate(amount=100.0, start_date=today - timedelta(days=5), end_date=today + timedelta(days=5), category_id=user_expense_category_budget.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    # Create an inactive budget (past)
    await client.post(f"{settings.API_V1_STR}/budgets/", json=BudgetCreate(amount=200.0, start_date=today - timedelta(days=60), end_date=today - timedelta(days=30), category_id=user_expense_category_budget.id).model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})

    response = await client.get(
        f"{settings.API_V1_STR}/budgets/?active_only=true",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    budgets = response.json()
    assert len(budgets) == 1 # Only the active budget
    assert budgets[0]["amount"] == 100.0

    response_all = await client.get(
        f"{settings.API_V1_STR}/budgets/?active_only=false",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response_all.status_code == 200
    all_budgets = response_all.json()
    assert len(all_budgets) >= 2 # Should include both active and inactive, plus any from init_db
    
@pytest.mark.asyncio
async def test_read_budget_by_id_success(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    budget_data = BudgetCreate(amount=300.0, start_date=today, end_date=today + timedelta(days=10), category_id=user_expense_category_budget.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    budget_id = create_response.json()["id"]

    response = await client.get(
        f"{settings.API_V1_STR}/budgets/{budget_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["id"] == budget_id
    assert response.json()["amount"] == budget_data.amount

@pytest.mark.asyncio
async def test_update_budget_success(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    budget_data = BudgetCreate(amount=100.0, start_date=today, end_date=today + timedelta(days=10), category_id=user_expense_category_budget.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    budget_id = create_response.json()["id"]

    update_data = BudgetUpdate(amount=150.0, end_date=today + timedelta(days=15))
    response = await client.put(
        f"{settings.API_V1_STR}/budgets/{budget_id}",
        json=update_data.model_dump(mode='json', exclude_unset=True),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    updated_budget = response.json()
    assert updated_budget["id"] == budget_id
    assert updated_budget["amount"] == update_data.amount
    assert updated_budget["end_date"] == str(update_data.end_date)

    budget_in_db = await crud_budget.get(db_session, id=budget_id)
    assert budget_in_db.amount == update_data.amount
    assert budget_in_db.end_date == update_data.end_date

@pytest.mark.asyncio
async def test_update_budget_to_overlapping_period(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    
    budget1_data = BudgetCreate(amount=100.0, start_date=today, end_date=today + timedelta(days=10), category_id=user_expense_category_budget.id)
    create_response1 = await client.post(f"{settings.API_V1_STR}/budgets/", json=budget1_data.model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    budget1_id = create_response1.json()["id"]

    budget2_data = BudgetCreate(amount=200.0, start_date=today + timedelta(days=11), end_date=today + timedelta(days=20), category_id=user_expense_category_budget.id)
    create_response2 = await client.post(f"{settings.API_V1_STR}/budgets/", json=budget2_data.model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    budget2_id = create_response2.json()["id"]

    # Try to update budget2's start_date to overlap with budget1
    update_data = BudgetUpdate(start_date=today + timedelta(days=5))
    response = await client.put(
        f"{settings.API_V1_STR}/budgets/{budget2_id}",
        json=update_data.model_dump(mode='json', exclude_unset=True),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 409
    assert "A budget for this category already exists for the specified period." in response.json()["detail"]

@pytest.mark.asyncio
async def test_delete_budget_success(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    budget_data = BudgetCreate(amount=50.0, start_date=today, end_date=today + timedelta(days=5), category_id=user_expense_category_budget.id)
    create_response = await client.post(
        f"{settings.API_V1_STR}/budgets/",
        json=budget_data.model_dump(mode='json'),
        headers={"Authorization": f"Bearer {user_token}"}
    )
    budget_id = create_response.json()["id"]

    response = await client.delete(
        f"{settings.API_V1_STR}/budgets/{budget_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Budget deleted successfully"

    budget_in_db = await crud_budget.get(db_session, id=budget_id)
    assert budget_in_db is None

@pytest.mark.asyncio
async def test_get_budget_progress_success(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    budget_start = today - timedelta(days=5)
    budget_end = today + timedelta(days=5)
    
    budget_data = BudgetCreate(amount=200.0, start_date=budget_start, end_date=budget_end, category_id=user_expense_category_budget.id)
    create_budget_response = await client.post(f"{settings.API_V1_STR}/budgets/", json=budget_data.model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    budget_id = create_budget_response.json()["id"]

    # Add some transactions within the budget period
    await crud_transaction.create_with_owner(db_session, obj_in=TransactionCreate(description="Exp1", amount=30.0, type="expense", category_id=user_expense_category_budget.id, transaction_date=datetime.combine(budget_start + timedelta(days=1), datetime.min.time(), tzinfo=UTC)), owner_id=user_obj.id)
    await crud_transaction.create_with_owner(db_session, obj_in=TransactionCreate(description="Exp2", amount=70.0, type="expense", category_id=user_expense_category_budget.id, transaction_date=datetime.combine(today, datetime.min.time(), tzinfo=UTC)), owner_id=user_obj.id)
    await db_session.commit()

    response = await client.get(
        f"{settings.API_V1_STR}/budgets/{budget_id}/progress",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    progress = response.json()
    assert progress["budget_id"] == budget_id
    assert progress["budget_amount"] == 200.0
    assert progress["total_spent"] == pytest.approx(100.0)
    assert progress["remaining_amount"] == pytest.approx(100.0)
    assert progress["percentage_spent"] == pytest.approx(50.0)
    assert progress["status"] == "within_budget"

@pytest.mark.asyncio
async def test_get_budget_progress_overbudget(client: AsyncClient, db_session, test_user, user_expense_category_budget):
    user_obj, user_token = test_user
    today = date.today()
    budget_start = today - timedelta(days=5)
    budget_end = today + timedelta(days=5)
    
    budget_data = BudgetCreate(amount=50.0, start_date=budget_start, end_date=budget_end, category_id=user_expense_category_budget.id)
    create_budget_response = await client.post(f"{settings.API_V1_STR}/budgets/", json=budget_data.model_dump(mode='json'), headers={"Authorization": f"Bearer {user_token}"})
    budget_id = create_budget_response.json()["id"]

    await crud_transaction.create_with_owner(db_session, obj_in=TransactionCreate(description="Overbudget Exp", amount=75.0, type="expense", category_id=user_expense_category_budget.id, transaction_date=datetime.combine(today, datetime.min.time(), tzinfo=UTC)), owner_id=user_obj.id)
    await db_session.commit()

    response = await client.get(
        f"{settings.API_V1_STR}/budgets/{budget_id}/progress",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    progress = response.json()
    assert progress["total_spent"] == pytest.approx(75.0)
    assert progress["remaining_amount"] == pytest.approx(-25.0)
    assert progress["percentage_spent"] == pytest.approx(150.0)
    assert progress["status"] == "overbudget"

```