```python
from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, categories, transactions, budgets

api_router = APIRouter()

api_router.include_router(auth.router, tags=["Authentication"], prefix="/auth")
api_router.include_router(users.router, tags=["Users"], prefix="/users")
api_router.include_router(categories.router, tags=["Categories"], prefix="/categories")
api_router.include_router(transactions.router, tags=["Transactions"], prefix="/transactions")
api_router.include_router(budgets.router, tags=["Budgets"], prefix="/budgets")
```