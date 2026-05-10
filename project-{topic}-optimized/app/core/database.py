from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Database setup for async operations
engine = create_async_engine(str(settings.ASYNC_SQLALCHEMY_DATABASE_URI), echo=False, future=True) # Set echo=True for SQL logging

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()
```

#### `app/core/logger.py`
```python