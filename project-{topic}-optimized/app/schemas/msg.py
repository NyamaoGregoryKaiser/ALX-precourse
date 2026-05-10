from pydantic import BaseModel


class Msg(BaseModel):
    msg: str

```

#### `app/services/data_collector.py`
```python