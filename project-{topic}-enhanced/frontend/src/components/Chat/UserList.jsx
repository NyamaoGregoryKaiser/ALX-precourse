```javascript
import React, { useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';

function UserList() {
  const { user } = useAuth();
  const { currentChannel, activeUsers } = useChat();
  const [currentChannelActiveUsers, setCurrentChannelActiveUsers] = useState([]);

  useEffect(() => {
    if (currentChannel) {
      const usersInChannel = activeUsers.get(currentChannel.id) || new Set();
      setCurrentChannelActiveUsers(Array.from(usersInChannel));
    } else {
      setCurrentChannelActiveUsers([]);
    }
  }, [currentChannel, activeUsers]);

  if (!currentChannel) {
    return (
      <div className="user-list-container">
        <h3>Users</h3>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#888' }}>
          Join a channel to see active users.
        </p>
      </div>
    );
  }

  // Sort users so current user is at the top
  const sortedUsers = [...currentChannelActiveUsers].sort((a, b) => {
    if (a.id === user.id) return -1;
    if (b.id === user.id) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <div className="user-list-container">
      <h3>Users in #{currentChannel.name}</h3>
      <ul className="user-list">
        {sortedUsers.map((activeUser) => (
          <li key={activeUser.id} className="user-list-item">
            <span className="user-status-indicator online"></span>
            {activeUser.username} {activeUser.id === user.id && '(You)'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
```