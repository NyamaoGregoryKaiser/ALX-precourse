```typescript
import React from 'react';
import { ChatRoom, User } from 'types';
import { ArrowLeftIcon, UserGroupIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface ChatHeaderProps {
  room: ChatRoom;
  onLeaveRoom: () => void;
  onGoBack?: () => void;
  currentUser: User;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ room, onLeaveRoom, onGoBack, currentUser }) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      navigate('/');
    }
  };

  const isOwner = currentUser.id === room.owner_id;

  return (
    <div className="bg-surface p-4 border-b border-border flex items-center justify-between">
      <div className="flex items-center">
        {onGoBack && (
          <button onClick={handleGoBack} className="text-textSecondary hover:text-text mr-3">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-text flex items-center">
            {room.is_private ? <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-400" /> : <HashtagIcon className="h-5 w-5 mr-2 text-gray-400" />}
            {room.name}
          </h2>
          <p className="text-sm text-textSecondary">{room.description || 'No description'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {/* You could add a button to view members, room settings, etc. */}
        {room.members.length > 0 && (
            <span className="text-textSecondary text-sm flex items-center">
                <UserGroupIcon className="h-4 w-4 mr-1" /> {room.members.length}
            </span>
        )}
        <button onClick={onLeaveRoom} className="btn-secondary px-3 py-1 text-sm">
          {isOwner && room.members.length === 1 ? "Delete Room" : "Leave Room"}
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
```