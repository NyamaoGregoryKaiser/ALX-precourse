```python
import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date, timedelta, UTC

from app.core.config import settings
from app.core.security import get_password_hash
from app.crud.crud_user import crud_user
from app.crud.crud_category import crud_category
from app.crud.crud_transaction import crud_transaction
from app.crud.crud_budget import crud_budget
from app.schemas.user import UserCreate
from app.schemas.category import CategoryCreate
from app.schemas.transaction import TransactionCreate
from app.schemas.budget import BudgetCreate

logger = logging.getLogger(__name__)

async def init_db(db: AsyncSession) -> None:
    """
    Initializes the database with a superuser and some seed data if it's empty.
    """
    logger.info("Initializing database with seed data...")

    # Check if superuser already exists
    user = await crud_user.get_by_email(db, email=settings.POSTGRES_USER)
    if not user:
        logger.info(f"Creating superuser: {settings.POSTGRES_USER}")
        user_in = UserCreate(
            email=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            full_name="Admin User",
            is_superuser=True,
            is_active=True,
        )
        user = await crud_user.create(db, obj_in=user_in)
        logger.info(f"Superuser '{user.email}' created.")
    else:
        logger.info(f"Superuser '{user.email}' already exists. Skipping creation.")

    if not user:
        logger.error("Failed to create or retrieve superuser. Cannot proceed with seeding.")
        return

    # Check if categories exist for this user
    existing_categories = await crud_category.get_multi_by_owner(db, owner_id=user.id)
    if not existing_categories:
        logger.info(f"Creating default categories for user {user.email}")
        default_categories_data: List[CategoryCreate] = [
            CategoryCreate(name="Salary", type="income"),
            CategoryCreate(name="Investments", type="income"),
            CategoryCreate(name="Food", type="expense"),
            CategoryCreate(name="Rent", type="expense"),
            CategoryCreate(name="Transportation", type="expense"),
            CategoryCreate(name="Utilities", type="expense"),
            CategoryCreate(name="Entertainment", type="expense"),
            CategoryCreate(name="Health", type="expense"),
            CategoryCreate(name="Education", type="expense"),
        ]
        created_categories = []
        for cat_data in default_categories_data:
            category = await crud_category.create_with_owner(db, obj_in=cat_data, owner_id=user.id)
            created_categories.append(category)
        logger.info(f"Created {len(created_categories)} default categories.")
    else:
        logger.info(f"Categories for user {user.email} already exist. Skipping creation.")
        created_categories = existing_categories

    # Seed some transactions if none exist for this user
    existing_transactions = await crud_transaction.get_multi_by_owner(db, owner_id=user.id)
    if not existing_transactions:
        logger.info(f"Creating sample transactions for user {user.email}")
        salary_cat = next((c for c in created_categories if c.name == "Salary"), None)
        food_cat = next((c for c in created_categories if c.name == "Food"), None)
        rent_cat = next((c for c in created_categories if c.name == "Rent"), None)

        if salary_cat and food_cat and rent_cat:
            sample_transactions_data: List[TransactionCreate] = [
                TransactionCreate(description="Monthly Salary", amount=5000.00, type="income",
                                  category_id=salary_cat.id, transaction_date=datetime.now(UTC) - timedelta(days=15)),
                TransactionCreate(description="Groceries", amount=75.50, type="expense",
                                  category_id=food_cat.id, transaction_date=datetime.now(UTC) - timedelta(days=10)),
                TransactionCreate(description="Apartment Rent", amount=1200.00, type="expense",
                                  category_id=rent_cat.id, transaction_date=datetime.now(UTC) - timedelta(days=5)),
                TransactionCreate(description="Dinner with friends", amount=45.20, type="expense",
                                  category_id=food_cat.id, transaction_date=datetime.now(UTC) - timedelta(days=2)),
            ]
            for transaction_data in sample_transactions_data:
                await crud_transaction.create_with_owner(db, obj_in=transaction_data, owner_id=user.id)
            logger.info(f"Created {len(sample_transactions_data)} sample transactions.")
        else:
            logger.warning("Could not find required categories for sample transactions. Skipping transaction seeding.")
    else:
        logger.info(f"Transactions for user {user.email} already exist. Skipping creation.")

    # Seed some budgets if none exist for this user
    existing_budgets = await crud_budget.get_multi_by_owner(db, owner_id=user.id)
    if not existing_budgets:
        logger.info(f"Creating sample budgets for user {user.email}")
        food_cat = next((c for c in created_categories if c.name == "Food"), None)
        entertainment_cat = next((c for c in created_categories if c.name == "Entertainment"), None)

        if food_cat and entertainment_cat:
            today = date.today()
            sample_budgets_data: List[BudgetCreate] = [
                BudgetCreate(amount=300.00, category_id=food_cat.id,
                             start_date=today.replace(day=1),
                             end_date=(today + timedelta(days=30)).replace(day=1) - timedelta(days=1)), # End of month
                BudgetCreate(amount=100.00, category_id=entertainment_cat.id,
                             start_date=today.replace(day=1),
                             end_date=(today + timedelta(days=30)).replace(day=1) - timedelta(days=1)),
            ]
            for budget_data in sample_budgets_data:
                await crud_budget.create_with_owner(db, obj_in=budget_data, owner_id=user.id)
            logger.info(f"Created {len(sample_budgets_data)} sample budgets.")
        else:
            logger.warning("Could not find required categories for sample budgets. Skipping budget seeding.")
    else:
        logger.info(f"Budgets for user {user.email} already exist. Skipping creation.")

    logger.info("Database initialization complete.")

```