```javascript
import React from 'react';
import moment from 'moment';

function Message({ message, isMyMessage }) {
  const { user, content, createdAt } = message;

  return (
    <div className={`message ${isMyMessage ? 'my-message' : ''}`}>
      <div className="message-header">
        <span className="message-username">{user.username}</span>
        <span className="message-time">{moment(createdAt).format('MMM D, h:mm A')}</span>
      </div>
      <div className="message-content">{content}</div>
    </div>
  );
}

export default Message;
```