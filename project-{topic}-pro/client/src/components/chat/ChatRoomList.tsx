import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChatRoom, User as ChatUser } from '../../types/chat';
import { getUserChatRooms, getAllUsers, createChatRoom } from '../../api/chat';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useSocket } from '../../contexts/SocketContext';

interface ChatRoomListProps {
  onSelectRoom: (roomId: string) => void;
  selectedRoomId: string | null;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({ onSelectRoom, selectedRoomId }) => {
  const { user: currentUser } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]); // User IDs
  const [isPrivateChatCreation, setIsPrivateChatCreation] = useState(false);
  const { socket, isConnected, messages } = useSocket();

  const fetchChatRooms = useCallback(async () => {
    setLoading(true);
    try {
      const rooms = await getUserChatRooms();
      // Sort rooms by last message date, putting rooms with unread messages at the top
      rooms.sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        // Prioritize rooms with unread messages
        if (a.unreadCount && !b.unreadCount) return -1;
        if (!a.unreadCount && b.unreadCount) return 1;
        return bTime - aTime;
      });
      setChatRooms(rooms);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch chat rooms.');
      console.error('Failed to fetch chat rooms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users.filter(u => u.id !== currentUser?.id)); // Exclude current user
    } catch (err: any) {
      console.error('Failed to fetch all users:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchChatRooms();
    fetchAllUsers();
  }, [fetchChatRooms, fetchAllUsers]);

  // Update lastMessage and unreadCount when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && currentUser) {
      setChatRooms(prevRooms => prevRooms.map(room => {
        const latestMessage = messages.find(m => m.chatRoomId === room.id);
        if (latestMessage) {
          const updatedRoom = { ...room, lastMessage: latestMessage };
          // Increment unread count if message is not from current user and not read
          if (latestMessage.senderId !== currentUser.id && !latestMessage.readBy.includes(currentUser.id)) {
            updatedRoom.unreadCount = (room.unreadCount || 0) + 1;
          }
          return updatedRoom;
        }
        return room;
      }).sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        if (a.unreadCount && !b.unreadCount) return -1;
        if (!a.unreadCount && b.unreadCount) return 1;
        return bTime - aTime;
      }));
    }
  }, [messages, currentUser]);

  // Handle room_updated socket event
  useEffect(() => {
    if (socket) {
      const handleRoomUpdated = (updatedRoom: ChatRoom) => {
        console.log('Room updated from socket:', updatedRoom);
        setChatRooms(prevRooms => {
          const existingRoomIndex = prevRooms.findIndex(r => r.id === updatedRoom.id);
          if (existingRoomIndex > -1) {
            // Merge existing data (like lastMessage, unreadCount) with updated data
            const mergedRoom = { ...prevRooms[existingRoomIndex], ...updatedRoom,
                participants: updatedRoom.participants, // Ensure participants are updated
            };
            const newRooms = [...prevRooms];
            newRooms[existingRoomIndex] = mergedRoom;
            return newRooms;
          } else {
            return [...prevRooms, updatedRoom]; // Add new room
          }
        });
      };
      socket.on('room_updated', handleRoomUpdated);
      return () => {
        socket.off('room_updated', handleRoomUpdated);
      };
    }
  }, [socket]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const type = isPrivateChatCreation ? 'private' : 'group';
      const participants = [...selectedParticipants, currentUser.id];

      // For private chats, ensure only 1 other participant is selected
      if (type === 'private' && participants.length !== 2) {
        setError('Private chat must have exactly one other participant.');
        return;
      }

      const response = await createChatRoom(newRoomName || undefined, type, selectedParticipants);
      setChatRooms(prev => {
        // Check if the room already exists (e.g., private chat creation)
        const existingRoomIndex = prev.findIndex(r => r.id === response.chatRoom.id);
        if (existingRoomIndex > -1) {
            // Update existing room if it came from the API (meaning it existed)
            prev[existingRoomIndex] = { ...prev[existingRoomIndex], ...response.chatRoom };
            return [...prev];
        }
        // Add new room
        return [response.chatRoom, ...prev];
      });
      onSelectRoom(response.chatRoom.id);
      setIsCreatingRoom(false);
      setNewRoomName('');
      setSelectedParticipants([]);
      setIsPrivateChatCreation(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create chat room.');
      console.error('Failed to create chat room:', err);
    }
  };

  const handleParticipantToggle = (userId: string) => {
    if (isPrivateChatCreation) {
      // For private chat, only one participant can be selected
      setSelectedParticipants(prev => (prev.includes(userId) ? [] : [userId]));
    } else {
      setSelectedParticipants(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const isUserTypingInRoom = useCallback((roomId: string) => {
    return typingUsers.some(tu => tu.roomId === roomId && tu.userId !== currentUser?.id);
  }, [typingUsers, currentUser?.id]);

  const getTypingUsernamesInRoom = useCallback((roomId: string) => {
    const users = typingUsers.filter(tu => tu.roomId === roomId && tu.userId !== currentUser?.id);
    if (users.length === 0) return '';
    const names = users.map(u => u.username);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return 'Multiple users are typing...';
  }, [typingUsers, currentUser?.id]);


  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="p-4 text-red-700 bg-red-100 rounded-md">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Chats</h2>
        <button
          onClick={() => setIsCreatingRoom(!isCreatingRoom)}
          className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {isCreatingRoom && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium mb-2">Create New Chat</h3>
          <form onSubmit={handleCreateRoom} className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="privateChat"
                checked={isPrivateChatCreation}
                onChange={(e) => {
                  setIsPrivateChatCreation(e.target.checked);
                  setNewRoomName(''); // Clear name if switching to private
                  setSelectedParticipants([]); // Clear selected participants
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="privateChat" className="text-sm font-medium text-gray-700">Private Chat</label>
            </div>

            {!isPrivateChatCreation && (
              <div>
                <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">Room Name</label>
                <input
                  id="roomName"
                  type="text"
                  required={!isPrivateChatCreation}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., Team Alpha Chat"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Participants</label>
              <div className="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                {allUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No other users found.</p>
                ) : (
                  allUsers.map(u => (
                    <div key={u.id} className="flex items-center py-1">
                      <input
                        type={isPrivateChatCreation ? 'radio' : 'checkbox'}
                        id={`user-${u.id}`}
                        name={isPrivateChatCreation ? 'privateParticipant' : `participant-${u.id}`}
                        checked={selectedParticipants.includes(u.id)}
                        onChange={() => handleParticipantToggle(u.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor={`user-${u.id}`} className="ml-2 text-sm text-gray-900 flex items-center">
                        {u.username}
                        <span className={`ml-2 w-2 h-2 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      </label>
                    </div>
                  ))
                )}
              </div>
              {isPrivateChatCreation && selectedParticipants.length === 0 && (
                <p className="text-red-500 text-xs mt-1">Select one user for a private chat.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || selectedParticipants.length === 0 || (!isPrivateChatCreation && !newRoomName.trim())}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Chat'}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {chatRooms.length === 0 ? (
          <p className="p-4 text-gray-500 text-center">No chat rooms yet. Start a new chat!</p>
        ) : (
          chatRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`flex items-center p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                selectedRoomId === room.id ? 'bg-indigo-50 border-indigo-500' : ''
              }`}
            >
              <div className="flex-shrink-0 relative">
                {/* Placeholder for avatar/group icon */}
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {room.name ? room.name[0].toUpperCase() : (room.type === 'private' ? 'P' : 'G')}
                </div>
                {room.type === 'private' && room.participants.some(p => p.isOnline && p.id !== currentUser?.id) && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                )}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{room.name}</p>
                    {room.lastMessage && (
                        <p className="text-xs text-gray-500">
                            {new Date(room.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
                {isUserTypingInRoom(room.id) ? (
                    <p className="text-sm text-indigo-600 italic">
                        {getTypingUsernamesInRoom(room.id)}
                    </p>
                ) : (
                    <div className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                        {room.lastMessage ? (
                            <>
                                {room.lastMessage.senderId === currentUser?.id ? 'You: ' : `${room.lastMessage.senderUsername}: `}
                                {room.lastMessage.content}
                            </>
                        ) : (
                            'No messages yet.'
                        )}
                    </div>
                )}
              </div>
              {room.unreadCount && room.unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {room.unreadCount}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatRoomList;