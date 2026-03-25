import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChatRoom, Message, User as ChatUser } from '../../types/chat';
import { getChatRoomMessages, getChatRoomDetails, addParticipantToRoom, removeParticipantFromRoom, deleteChatRoom } from '../../api/chat';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { PaperAirplaneIcon, TrashIcon, UserMinusIcon, UserPlusIcon } from '@heroicons/react/24/solid';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';

interface ChatWindowProps {
  roomId: string;
  onRoomDeleted: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, onRoomDeleted }) => {
  const { user: currentUser } = useAuth();
  const { socket, isConnected, messages, setMessages, joinRoom, leaveRoom, sendMessage, sendTypingStart, sendTypingStop, typingUsers, markMessageRead } = useSocket();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');


  const fetchRoomDetails = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const roomDetails = await getChatRoomDetails(roomId);
      setRoom(roomDetails);
      const fetchedMessages = await getChatRoomMessages(roomId);
      setMessages(fetchedMessages); // Set messages from API
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chat room.');
      console.error('Failed to load chat room:', err);
      setMessages([]);
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId, setMessages]);

  useEffect(() => {
    fetchRoomDetails();
    if (socket) {
        joinRoom(roomId);

        // Mark all messages as read when joining a room
        messages.filter(msg => msg.chatRoomId === roomId && !msg.readBy.includes(currentUser!.id) && msg.senderId !== currentUser!.id)
                 .forEach(msg => markMessageRead(msg.id, roomId));
    }

    return () => {
        if (socket) {
            leaveRoom(roomId);
            // Optionally clear messages from previous room to prevent flicker
            // setMessages([]);
        }
    };
  }, [roomId, fetchRoomDetails, joinRoom, leaveRoom, socket, messages, currentUser, markMessageRead]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]); // Scroll to bottom when messages or typing status changes

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && roomId) {
      sendMessage(roomId, newMessage);
      setNewMessage('');
      sendTypingStop(roomId); // Ensure typing stops after sending message
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (!isConnected || !socket || !currentUser) return;

    if (!isTypingRef.current) {
      sendTypingStart(roomId);
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(roomId);
      isTypingRef.current = false;
      typingTimeoutRef.current = null;
    }, 3000); // Stop typing after 3 seconds of no activity
  };

  const getTypingUsernames = useCallback(() => {
    const usersInRoomTyping = typingUsers.filter(tu => tu.roomId === roomId && tu.userId !== currentUser?.id);
    if (usersInRoomTyping.length === 0) return '';
    const names = usersInRoomTyping.map(u => u.username);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return 'Multiple users are typing...';
  }, [typingUsers, roomId, currentUser?.id]);


  const handleAddParticipant = async () => {
    if (!selectedUserToAdd || !room) return;
    try {
        const response = await addParticipantToRoom(room.id, selectedUserToAdd);
        setRoom(prev => prev ? { ...prev, participants: response.chatRoom.participants } : response.chatRoom);
        setShowAddParticipantModal(false);
        setSelectedUserToAdd('');
        alert(`User added to ${room.name || 'this chat'}`);
    } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add participant.');
        console.error('Failed to add participant:', err);
    }
  };

  const handleRemoveParticipant = async (userIdToRemove: string) => {
    if (!room || !window.confirm(`Are you sure you want to remove this user?`)) return;
    try {
        await removeParticipantFromRoom(room.id, userIdToRemove);
        setRoom(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.id !== userIdToRemove) } : null);
        alert('Participant removed.');
    } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to remove participant.');
        console.error('Failed to remove participant:', err);
    }
  };

  const handleDeleteRoom = async () => {
    if (!room || !window.confirm(`Are you sure you want to delete "${room.name || 'this private chat'}"? This action cannot be undone.`)) return;
    try {
        await deleteChatRoom(room.id);
        alert('Chat room deleted successfully.');
        onRoomDeleted();
    } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete chat room.');
        console.error('Failed to delete chat room:', err);
    }
  };

  const openAddParticipantModal = async () => {
    try {
        const users = await getChatRoomDetails(roomId); // Get current participants from the room
        const currentParticipantIds = new Set(users.participants.map(p => p.id));
        const allSystemUsers = await getChatRoomDetails(roomId); // Using getChatRoomDetails to fetch available users indirectly for now
                                                               // Ideally, you'd have a separate API to get all users or users not in a specific room
        setAvailableUsers(allSystemUsers.participants.filter(u => !currentParticipantIds.has(u.id))); // Filter out current participants
        setShowAddParticipantModal(true);
    } catch (err) {
        setError('Failed to fetch users to add.');
        console.error('Error fetching users for add participant:', err);
    }
  };

  const getParticipantsToDisplay = (room: ChatRoom) => {
    if (room.type === 'private') {
      return room.participants.find(p => p.id !== currentUser?.id)?.username || 'Unknown User';
    }
    return room.name || 'Group Chat';
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full p-4 text-red-700 bg-red-100 rounded-md">{error}</div>;
  }

  if (!room) {
    return <div className="flex items-center justify-center h-full text-gray-500">Select a chat to start messaging</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">{getParticipantsToDisplay(room)}</h2>
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    Options
                    <EllipsisVerticalIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
                </MenuButton>
            </div>
            <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {room.type === 'group' && (
                            <MenuItem>
                                {({ focus }) => (
                                    <button
                                        onClick={openAddParticipantModal}
                                        className={`${
                                            focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                        } flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                        <UserPlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                                        Add Participant
                                    </button>
                                )}
                            </MenuItem>
                        )}
                        {room.type === 'group' && room.participants.length > 2 && ( // Allow removing if more than 2 participants
                            <MenuItem>
                                {({ focus }) => (
                                    <button
                                        // TODO: Implement a modal to select user to remove
                                        onClick={() => alert('Feature to select participant to remove not implemented yet.')}
                                        className={`${
                                            focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                        } flex w-full items-center px-4 py-2 text-sm`}
                                    >
                                        <UserMinusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                                        Remove Participant
                                    </button>
                                )}
                            </MenuItem>
                        )}
                        <MenuItem>
                            {({ focus }) => (
                                <button
                                    onClick={handleDeleteRoom}
                                    className={`${
                                        focus ? 'bg-red-100 text-red-900' : 'text-red-700'
                                    } flex w-full items-center px-4 py-2 text-sm`}
                                >
                                    <TrashIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                                    Delete Chat
                                </button>
                            )}
                        </MenuItem>
                    </div>
                </MenuItems>
            </Transition>
        </Menu>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-md ${
                message.senderId === currentUser?.id
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="font-semibold text-sm">
                {message.senderId === currentUser?.id ? 'You' : message.senderUsername}
              </p>
              <p className="mt-1 text-base">{message.content}</p>
              <div className={`mt-1 text-xs text-right ${message.senderId === currentUser?.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {message.senderId === currentUser?.id && message.readBy && message.readBy.length > 1 && (
                    <span className="ml-1">✓✓</span> // Simple read receipt for sender
                )}
                {message.senderId === currentUser?.id && message.isRead && message.readBy.length === 1 && ( // Single check for sent, single read
                    <span className="ml-1">✓</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {getTypingUsernames() && (
            <div className="flex justify-start">
                <div className="max-w-xs p-3 rounded-lg shadow-md bg-gray-100 text-gray-600 rounded-bl-none italic text-sm">
                    {getTypingUsernames()}
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <textarea
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={1}
            placeholder="Type your message..."
            value={newMessage}
            onChange={handleNewMessageChange}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                }
            }}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={!newMessage.trim() || !isConnected}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>

      {/* Add Participant Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">Add Participant to {room.name}</h3>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="mb-4">
              <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
              <select
                id="userSelect"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={selectedUserToAdd}
                onChange={(e) => setSelectedUserToAdd(e.target.value)}
              >
                <option value="">-- Select a user --</option>
                {availableUsers.length > 0 ? (
                    availableUsers.map(user => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                    ))
                ) : (
                    <option disabled>No users to add</option>
                )}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddParticipantModal(false)}
                className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParticipant}
                disabled={!selectedUserToAdd}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;