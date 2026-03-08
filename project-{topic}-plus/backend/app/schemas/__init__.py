```python
# Import schemas here for easier access
from .user import UserBase, UserCreate, UserUpdate, UserInDB, UserPublic
from .token import Token, TokenData
from .chat_room import ChatRoomBase, ChatRoomCreate, ChatRoomUpdate, ChatRoomInDB, ChatRoomPublic
from .message import MessageBase, MessageCreate, MessageInDB, MessagePublic
```