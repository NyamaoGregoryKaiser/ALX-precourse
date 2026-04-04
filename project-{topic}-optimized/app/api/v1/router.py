from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, items, orders

# Main API router for version 1
api_router = APIRouter()

# Include individual routers for different modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(items.router, prefix="/items", tags=["Items"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
```