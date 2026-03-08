```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import axiosInstance from 'api/axiosInstance';
import { ChatRoom, User } from 'types';
import RoomList from 'components/RoomList';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState<ChatRoom[]>([]);
  const [myRooms, setMyRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const publicResponse = await axiosInstance.get('/api/v1/rooms/');
      setPublicRooms(publicResponse.data);

      if (user) {
        // Fetch rooms the user is a member of (this endpoint should ideally be /users/me/rooms)
        // For simplicity, we filter existing public rooms. A dedicated backend endpoint is better.
        const allRoomsResponse = await axiosInstance.get('/api/v1/rooms/?skip=0&limit=999'); // Fetch all rooms (public) to find user's joined ones
        const userJoinedRooms = allRoomsResponse.data.filter((room: ChatRoom) =>
          room.members.some(member => member.id === user.id)
        );
        setMyRooms(userJoinedRooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      // Handle error, e.g., show a toast message
    } finally {
      setIsLoadingRooms(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSelectRoom = (roomId: number) => {
    setActiveRoomId(roomId);
    navigate(`/chat/${roomId}`);
  };

  const openCreateRoomModal = () => {
    setIsModalOpen(true);
    setCreateRoomError(null);
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomIsPrivate(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRoomError(null);
    try {
      const response = await axiosInstance.post('/api/v1/rooms/', {
        name: newRoomName,
        description: newRoomDescription,
        is_private: newRoomIsPrivate,
      });
      const newRoom: ChatRoom = response.data;
      // Refresh room lists
      await fetchRooms();
      setIsModalOpen(false);
      navigate(`/chat/${newRoom.id}`); // Navigate to the newly created room
    } catch (error: any) {
      console.error('Error creating room:', error);
      setCreateRoomError(error.response?.data?.detail || 'Failed to create room.');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-text">
        Loading user data...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-text">
      {/* Sidebar with User Info and Room List */}
      <div className="w-80 bg-surface border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-2xl font-bold text-text mb-2">Welcome, {user.username}!</h2>
          <p className="text-sm text-textSecondary">{user.email}</p>
        </div>

        {isLoadingRooms ? (
            <div className="p-4 text-textSecondary">Loading rooms...</div>
        ) : (
            <RoomList
                rooms={publicRooms}
                onSelectRoom={handleSelectRoom}
                activeRoomId={activeRoomId}
                onCreateRoom={openCreateRoomModal}
                myRooms={myRooms}
            />
        )}

        <div className="p-4 border-t border-border mt-auto">
          <button onClick={logout} className="btn-secondary w-full">
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area - Instructions or empty state */}
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-text mb-4">Select a chat room to begin!</h1>
          <p className="text-lg text-textSecondary">
            Choose from the list on the left or create your own room.
          </p>
          <button onClick={openCreateRoomModal} className="btn-primary mt-6">
            Create New Room
          </button>
        </div>
      </div>

      {/* Create Room Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-surface p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-text flex justify-between items-center">
                    Create New Chat Room
                    <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-text">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                  </Dialog.Title>
                  <form onSubmit={handleCreateRoom} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="roomName" className="block text-textSecondary text-sm font-bold mb-2">
                        Room Name
                      </label>
                      <input
                        type="text"
                        id="roomName"
                        className="input-field"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="roomDescription" className="block text-textSecondary text-sm font-bold mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        id="roomDescription"
                        className="input-field"
                        value={newRoomDescription}
                        onChange={(e) => setNewRoomDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPrivate"
                        className="h-4 w-4 text-primary rounded border-border focus:ring-primary"
                        checked={newRoomIsPrivate}
                        onChange={(e) => setNewRoomIsPrivate(e.target.checked)}
                      />
                      <label htmlFor="isPrivate" className="ml-2 block text-textSecondary text-sm">
                        Private Room
                      </label>
                    </div>
                    {createRoomError && <p className="error-message">{createRoomError}</p>}
                    <div className="mt-4">
                      <button
                        type="submit"
                        className="btn-primary w-full"
                      >
                        Create Room
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default HomePage;
```