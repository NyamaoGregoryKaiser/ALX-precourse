import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createChatRoom } from '../api/chat';

const ChatList = ({ title, rooms, onRoomCreated, canCreate = false }) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    if (!newRoomName.trim()) {
      setError('Room name cannot be empty.');
      return;
    }
    setCreating(true);
    try {
      const newRoom = await createChatRoom(newRoomName);
      onRoomCreated(newRoom);
      setNewRoomName('');
    } catch (err) {
      setError(err || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 w-full lg:w-1/3">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">{title}</h2>
      {canCreate && (
        <form onSubmit={handleCreateRoom} className="mb-6">
          <input
            type="text"
            placeholder="New room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md mb-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={creating}
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition duration-300 disabled:opacity-50"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      )}

      {rooms.length === 0 ? (
        <p className="text-gray-500">No rooms available.</p>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link
                to={`/chat/${room.id}`}
                className="block p-4 bg-gray-50 hover:bg-blue-100 rounded-md transition duration-300 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-600">Created by: {room.creator.username}</p>
                </div>
                <span className="text-sm text-blue-600">{room.participantCount} participants</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;