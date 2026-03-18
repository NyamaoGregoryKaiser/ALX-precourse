```python
from pydantic import BaseModel


class Msg(BaseModel):
    """Generic message schema."""
    message: str
```