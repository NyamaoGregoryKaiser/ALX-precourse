from app.crud.base import CRUDBase
from app.models.alert_rule import AlertRule
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleUpdate


class CRUDAlertRule(CRUDBase[AlertRule, AlertRuleCreate, AlertRuleUpdate]):
    pass # No specific methods needed beyond CRUDBase for now

crud_alert_rule = CRUDAlertRule(AlertRule)

```

```python