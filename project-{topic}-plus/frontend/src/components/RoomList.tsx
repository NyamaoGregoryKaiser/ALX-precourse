```typescript
import React from 'react';
import { ChatRoom, RoomListItemProps } from 'types';
import { PlusIcon } from '@heroicons/react/24/outline';

interface RoomListProps {
  rooms: ChatRoom[];
  onSelectRoom: (roomId: number) => void;
  activeRoomId: number | null;
  onCreateRoom: () => void;
  myRooms: ChatRoom[];
}

const RoomListItem: React.FC<RoomListItemProps> = ({ room, onSelectRoom, isActive }) => {
  return (
    <button
      onClick={() => onSelectRoom(room.id)}
      className={`block w-full text-left p-3 rounded-lg hover:bg-border transition-colors duration-150 ease-in-out ${
        isActive ? 'bg-primary text-white' : 'bg-surface text-text'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-semibold">{room.name}</span>
        {room.is_private && (
          <span className="text-xs text-textSecondary px-2 py-1 rounded-full bg-border">Private</span>
        )}
      </div>
      <p className={`text-sm mt-1 truncate ${isActive ? 'text-indigo-100' : 'text-textSecondary'}`}>
        {room.description || 'No description'}
      </p>
    </button>
  );
};

const RoomList: React.FC<RoomListProps> = ({ rooms, onSelectRoom, activeRoomId, onCreateRoom, myRooms }) => {
  return (
    <div className="w-80 bg-surface border-r border-border flex flex-col p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-text">Chat Rooms</h3>
        <button
          onClick={onCreateRoom}
          className="btn-primary p-2 flex items-center justify-center rounded-full text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-75"
          title="Create New Room"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-semibold text-textSecondary mb-2">My Rooms</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {myRooms.length === 0 ? (
            <p className="text-textSecondary text-sm">You haven't joined any rooms yet.</p>
          ) : (
            myRooms.map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                onSelectRoom={onSelectRoom}
                isActive={activeRoomId === room.id}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex-grow">
        <h4 className="text-lg font-semibold text-textSecondary mb-2">Public Rooms</h4>
        <div className="space-y-2 max-h-[calc(100vh-25rem)] overflow-y-auto pr-2">
          {rooms.length === 0 ? (
            <p className="text-textSecondary text-sm">No public rooms available.</p>
          ) : (
            rooms.map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                onSelectRoom={onSelectRoom}
                isActive={activeRoomId === room.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomList;
```