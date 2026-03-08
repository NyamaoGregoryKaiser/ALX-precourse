```python
# Import models here to make them discoverable by Alembic for autogenerate
from .user import User, UserRoomAssociation
from .chat_room import ChatRoom
from .message import Message
from .base import Base # Import Base from its new location
```