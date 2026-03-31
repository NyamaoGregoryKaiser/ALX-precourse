```typescript
import React from 'react';
import { Chat } from '../types';

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: number) => void;
  selectedChatId: number | null;
}

const ChatList: React.FC<ChatListProps> = ({ chats, onSelectChat, selectedChatId }) => {
  return (
    <div className="chat-list">
      <h2>Your Chats</h2>
      <ul>
        {chats.map((chat) => (
          <li
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={chat.id === selectedChatId ? 'active' : ''}
          >
            {chat.name} ({chat.is_group ? 'Group' : 'DM'})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList;
```