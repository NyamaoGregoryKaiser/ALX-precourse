from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, DateTime
from datetime import datetime
from sqlalchemy.sql import func as sql_func

# Base class for all models, providing common fields
class CustomBase:
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=sql_func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=sql_func.now(), server_default=sql_func.now(), nullable=False)

Base = declarative_base(cls=CustomBase)

```

#### `app/models/user.py`
```python