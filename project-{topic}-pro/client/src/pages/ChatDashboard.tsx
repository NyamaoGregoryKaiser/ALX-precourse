import React, { useState, useEffect } from 'react';
import ChatRoomList from '../components/chat/ChatRoomList';
import ChatWindow from '../components/chat/ChatWindow';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';

const ChatDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleRoomDeleted = () => {
    setSelectedRoomId(null); // Clear selected room after deletion
    // Optionally trigger a refresh of the chat room list here
  };

  if (!user) {
    return null; // Or a loading spinner while redirecting
  }

  return (
    <div className="flex h-screen bg-gray-100 antialiased text-gray-900">
      {/* Sidebar for user info and logout */}
      <div className="flex flex-col w-64 bg-indigo-700 text-white p-4">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold mb-4">ChatApp</h1>
          <div className="mb-6">
            <p className="text-lg font-medium">{user.username}</p>
            <p className="text-sm text-indigo-200">{user.email}</p>
          </div>
          {/* Add other user details or profile links here */}
        </div>
        <div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1">
        {/* Chat Room List */}
        <div className="w-1/3 min-w-[280px] max-w-sm border-r border-gray-200 bg-white">
          <ChatRoomList onSelectRoom={setSelectedRoomId} selectedRoomId={selectedRoomId} />
        </div>

        {/* Chat Window */}
        <div className="flex-1">
          {selectedRoomId ? (
            <ChatWindow roomId={selectedRoomId} onRoomDeleted={handleRoomDeleted} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-lg">
              Select a chat or start a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDashboard;