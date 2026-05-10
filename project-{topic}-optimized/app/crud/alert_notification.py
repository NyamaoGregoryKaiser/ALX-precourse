from app.crud.base import CRUDBase
from app.models.alert_notification import AlertNotification
from app.schemas.alert_notification import AlertNotificationCreate, AlertNotificationUpdate


class CRUDAlertNotification(CRUDBase[AlertNotification, AlertNotificationCreate, AlertNotificationUpdate]):
    pass # No specific methods needed beyond CRUDBase for now

crud_alert_notification = CRUDAlertNotification(AlertNotification)

```

#### `app/core/config.py`
```python