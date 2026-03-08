```typescript
import React, { useEffect, useState, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from 'hooks/useAuth';
import { useWebSocket } from 'hooks/useWebSocket';
import axiosInstance from 'api/axiosInstance';
import { ChatRoom, MessagePayload, WebSocketMessageType } from 'types';
import ChatHeader from 'components/ChatHeader';
import MessageList from 'components/MessageList';
import ChatInput from 'components/ChatInput';
import UserList from 'components/UserList';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';


const ChatPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    isConnected,
    messages,
    connect,
    disconnect,
    clearMessages,
    lastMessage // Use lastMessage to trigger re-renders only when a new message arrives from WS
  } = useWebSocket();
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJoinConfirmationOpen, setIsJoinConfirmationOpen] = useState(false);

  // Parse roomId to number
  const roomIdNum = roomId ? parseInt(roomId, 10) : null;

  // --- Fetch Room Details and Messages ---
  const fetchRoomDetails = useCallback(async () => {
    if (!roomIdNum) return;
    setError(null);
    try {
      const response = await axiosInstance.get(`/api/v1/rooms/${roomIdNum}`);
      setCurrentRoom(response.data);
      // If user is not a member of a private room, prompt to join (or redirect)
      if (response.data.is_private && !response.data.members.some((member: any) => member.id === user?.id)) {
        // Here, we decide to prevent joining a private room unless explicitly invited or owner
        // For simplicity, we just redirect or show error for now.
        // A more complex flow would involve an "invite" system.
        setError("You are not authorized to access this private room.");
        navigate('/'); // Redirect to home
        return;
      }

      // If user is not a member of a public room, offer to join
      if (!response.data.is_private && !response.data.members.some((member: any) => member.id === user?.id)) {
        setIsJoinConfirmationOpen(true);
      }

    } catch (err: any) {
      console.error('Failed to fetch room details:', err);
      setError(err.response?.data?.detail || 'Failed to load room details.');
      navigate('/'); // Redirect on error
    }
  }, [roomIdNum, user, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!roomIdNum) return;
    setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/api/v1/messages/${roomIdNum}`);
      clearMessages(); // Clear existing WS messages before loading history
      // Add historical messages to WebSocketContext's message list (in correct order)
      const historicalMessages: WebSocketMessageType[] = response.data.map((msg: any) => ({
        ...msg,
        type: 'message' // Explicitly set type for historical messages
      })).reverse(); // Reverse to add oldest first, for display from bottom-up
      // Ensure messages are appended without duplicates or order issues
      // For simplicity, we replace with historical messages + any new WS messages
      setMessages(historicalMessages); // Replace with historical messages. WS messages will be added on top.
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      setError(err.response?.data?.detail || 'Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, [roomIdNum, clearMessages, setMessages]);


  useEffect(() => {
    if (!roomIdNum || !user || !token) {
      navigate('/');
      return;
    }

    // Connect to WebSocket only when room details are loaded and user is authenticated
    if (user && token && roomIdNum) {
      fetchRoomDetails();
    }
    
    // Cleanup WebSocket on component unmount or room change
    return () => {
        disconnect();
        clearMessages();
    };
  }, [roomIdNum, user, token, navigate, connect, disconnect, clearMessages, fetchRoomDetails]);

  // Effect to connect/reconnect WebSocket once room details are fetched and user is a member
  useEffect(() => {
    if (currentRoom && user && token && roomIdNum && !isJoinConfirmationOpen) {
      const isUserMember = currentRoom.members.some(member => member.id === user.id);
      if (isUserMember && !isConnected) {
        connect(roomIdNum, token);
      }
      // Fetch messages after successful room details fetch and potential join
      if (isUserMember && currentRoom) {
          fetchMessages();
      }
    }
  }, [currentRoom, user, token, roomIdNum, connect, isConnected, fetchMessages, isJoinConfirmationOpen]);


  // --- Message Sending ---
  const handleSendMessage = async (content: string) => {
    if (!currentRoom || !user || !token) {
      setError('Cannot send message: Not in a room or not authenticated.');
      return;
    }
    setSendingMessage(true);
    try {
      const messagePayload: MessagePayload = { content };
      await axiosInstance.post(`/api/v1/messages/${currentRoom.id}`, messagePayload);
      // Message will be received via WebSocket, no need to manually add to state
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.detail || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // --- Room Actions ---
  const handleLeaveRoom = async () => {
    if (!currentRoom || !user) return;
    try {
      const isOwner = currentRoom.owner_id === user.id;
      const isOnlyMember = currentRoom.members.length === 1 && currentRoom.members[0].id === user.id;

      if (isOwner && isOnlyMember) {
        // If owner is the only member, it's treated as deleting the room
        if (window.confirm("You are the only member and owner. Leaving will delete the room. Are you sure?")) {
          await axiosInstance.delete(`/api/v1/rooms/${currentRoom.id}`);
          navigate('/');
        }
      } else {
        await axiosInstance.post(`/api/v1/rooms/${currentRoom.id}/leave`);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Failed to leave/delete room:', err);
      setError(err.response?.data?.detail || 'Failed to leave room.');
    }
  };

  const handleConfirmJoin = async () => {
    if (!roomIdNum || !user || !token) return;
    try {
      await axiosInstance.post(`/api/v1/rooms/${roomIdNum}/join`);
      setIsJoinConfirmationOpen(false);
      fetchRoomDetails(); // Re-fetch room details to update membership
    } catch (err: any) {
      console.error('Failed to join room:', err);
      setError(err.response?.data?.detail || 'Failed to join room.');
      navigate('/');
    }
  };

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-text">
        {error ? <p className="text-danger">{error}</p> : <p>Loading room...</p>}
      </div>
    );
  }

  // Determine current room members for the UserList
  const currentRoomMembers = currentRoom.members || [];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col">
        <ChatHeader room={currentRoom} onLeaveRoom={handleLeaveRoom} onGoBack={() => navigate('/')} currentUser={user!} />
        <MessageList messages={messages} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={sendingMessage} />
      </div>

      {/* Right Sidebar - User List */}
      <UserList users={currentRoomMembers} title="Room Members" />

      {/* Join Confirmation Modal */}
      <Transition appear show={isJoinConfirmationOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsJoinConfirmationOpen(false)}>
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
                    Join Room: {currentRoom.name}?
                    <button onClick={() => setIsJoinConfirmationOpen(false)} className="text-textSecondary hover:text-text">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-textSecondary">
                      You are not currently a member of this room. Do you want to join to participate in the conversation?
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => { setIsJoinConfirmationOpen(false); navigate('/'); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleConfirmJoin}
                    >
                      Join Room
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default ChatPage;
```