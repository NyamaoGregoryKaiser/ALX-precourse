```python
from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None

class TokenPayload(BaseModel):
    user_id: Optional[int] = None
    sub: Optional[str] = None # 'access' or 'refresh' token type
```