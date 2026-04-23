```python
import logging
from typing import Any, List, Optional
from datetime import date

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.depends import RateLimiter

from app.core.deps import get_db, CurrentUser
from app.core.exceptions import HTTPException400, HTTPException404, HTTPException409
from app.core.cache import cache_1_minute
from app.crud.crud_budget import crud_budget
from app.crud.crud_category import crud_category
from app.crud.crud_transaction import crud_transaction
from app.schemas.budget import Budget, BudgetCreate, BudgetUpdate
from app.schemas.msg import Msg
from app.db.models.budget import Budget as DBBudget
from app.db.models.category import Category as DBCategory

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[Budget], summary="Retrieve user's budgets",
            dependencies=[Depends(RateLimiter(times=10, seconds=60))])
@cache_1_minute
async def read_budgets(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True, description="Filter for budgets active on today's date"),
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Retrieve budgets belonging to the current user, with an option to filter for active budgets.
    """
    if active_only:
        budgets = await crud_budget.get_active_budgets_by_owner(
            db, owner_id=current_user.id, current_date=date.today(), skip=skip, limit=limit
        )
    else:
        budgets = await crud_budget.get_multi_by_owner(db, owner_id=current_user.id, skip=skip, limit=limit)
    logger.info(f"User {current_user.email} retrieved {len(budgets)} budgets (active_only: {active_only}).")
    return budgets

@router.post("/", response_model=Budget, status_code=status.HTTP_201_CREATED, summary="Create a new budget")
async def create_budget(
    *,
    db: AsyncSession = Depends(get_db),
    budget_in: BudgetCreate,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Create a new budget for the current user.
    """
    if budget_in.start_date >= budget_in.end_date:
        raise HTTPException400(detail="Start date must be before end date.")

    # Verify category exists and belongs to the current user
    category = await crud_category.get(db, id=budget_in.category_id)
    if not category or category.owner_id != current_user.id:
        raise HTTPException400(detail="Category not found or does not belong to you.")
    
    if category.type == "income":
        raise HTTPException400(detail="Budgets can only be set for 'expense' categories.")

    # Check for overlapping budgets for the same category and period
    existing_budget = await crud_budget.get_by_owner_category_and_period(
        db,
        owner_id=current_user.id,
        category_id=budget_in.category_id,
        start_date=budget_in.start_date,
        end_date=budget_in.end_date
    )
    if existing_budget:
        raise HTTPException409(detail="A budget for this category already exists for the specified period.")

    budget = await crud_budget.create_with_owner(db, obj_in=budget_in, owner_id=current_user.id)
    logger.info(f"User {current_user.email} created budget: {budget.amount} for category {category.name}")
    return budget

@router.get("/{budget_id}", response_model=Budget, summary="Retrieve a specific budget")
async def read_budget_by_id(
    budget_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Get a specific budget by ID, ensuring it belongs to the current user.
    """
    budget = await crud_budget.get(db, id=budget_id)
    if not budget or budget.owner_id != current_user.id:
        raise HTTPException404(detail="Budget not found or you don't have permission to access it.")
    logger.info(f"User {current_user.email} accessed budget with ID: {budget_id}")
    return budget

@router.put("/{budget_id}", response_model=Budget, summary="Update a budget")
async def update_budget(
    *,
    db: AsyncSession = Depends(get_db),
    budget_id: int,
    budget_in: BudgetUpdate,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Update a budget for the current user.
    """
    budget = await crud_budget.get(db, id=budget_id)
    if not budget or budget.owner_id != current_user.id:
        raise HTTPException404(detail="Budget not found or you don't have permission to update it.")
    
    if budget_in.start_date and budget_in.end_date and budget_in.start_date >= budget_in.end_date:
        raise HTTPException400(detail="Start date must be before end date.")

    # Verify category if it's being changed
    if budget_in.category_id and budget_in.category_id != budget.category_id:
        category = await crud_category.get(db, id=budget_in.category_id)
        if not category or category.owner_id != current_user.id:
            raise HTTPException400(detail="New category not found or does not belong to you.")
        if category.type == "income":
            raise HTTPException400(detail="Budgets can only be set for 'expense' categories.")

    # Check for overlapping budgets if period or category is changing
    new_start_date = budget_in.start_date if budget_in.start_date is not None else budget.start_date
    new_end_date = budget_in.end_date if budget_in.end_date is not None else budget.end_date
    new_category_id = budget_in.category_id if budget_in.category_id is not None else budget.category_id

    if (new_start_date, new_end_date, new_category_id) != (budget.start_date, budget.end_date, budget.category_id):
        existing_budget = await crud_budget.get_by_owner_category_and_period(
            db,
            owner_id=current_user.id,
            category_id=new_category_id,
            start_date=new_start_date,
            end_date=new_end_date
        )
        if existing_budget and existing_budget.id != budget_id:
            raise HTTPException409(detail="A budget for this category already exists for the specified period.")

    budget = await crud_budget.update(db, db_obj=budget, obj_in=budget_in)
    logger.info(f"User {current_user.email} updated budget with ID: {budget_id}")
    return budget

@router.delete("/{budget_id}", response_model=Msg, summary="Delete a budget")
async def delete_budget(
    *,
    db: AsyncSession = Depends(get_db),
    budget_id: int,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Delete a budget belonging to the current user.
    """
    budget = await crud_budget.get(db, id=budget_id)
    if not budget or budget.owner_id != current_user.id:
        raise HTTPException404(detail="Budget not found or you don't have permission to delete it.")
    
    await crud_budget.remove(db, id=budget_id)
    logger.info(f"User {current_user.email} deleted budget with ID: {budget_id}")
    return Msg(message="Budget deleted successfully")

@router.get("/{budget_id}/progress", summary="Get budget progress")
async def get_budget_progress(
    budget_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Calculate and return the progress for a specific budget (amount spent vs. budget amount).
    """
    budget = await crud_budget.get(db, id=budget_id)
    if not budget or budget.owner_id != current_user.id:
        raise HTTPException404(detail="Budget not found or you don't have permission to access it.")

    # Ensure the category for the budget is an 'expense' category
    category = await crud_category.get(db, id=budget.category_id)
    if not category or category.type == "income":
        raise HTTPException400(detail="Budget category is not an expense category.")

    total_spent = await crud_transaction.get_total_by_category_and_period(
        db,
        owner_id=current_user.id,
        category_id=budget.category_id,
        start_date=budget.start_date,
        end_date=budget.end_date
    )

    remaining_amount = budget.amount - total_spent
    percentage_spent = (total_spent / budget.amount * 100) if budget.amount > 0 else 0

    logger.info(f"User {current_user.email} queried progress for budget {budget_id}.")
    return {
        "budget_id": budget.id,
        "category_id": budget.category_id,
        "budget_amount": budget.amount,
        "total_spent": total_spent,
        "remaining_amount": remaining_amount,
        "percentage_spent": round(percentage_spent, 2),
        "status": "overbudget" if remaining_amount < 0 else "within_budget"
    }

```