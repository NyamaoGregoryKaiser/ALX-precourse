import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChatRoomDetails, getMessageHistory, leaveChatRoom, getRoomParticipants } from '../api/chat';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';
import UserList from '../components/UserList';
import { useAuth } from '../context/AuthContext';
import { useChatWebSocket } from '../hooks/useChatWebSocket';

const ChatPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleNewMessage = useCallback((newMessage) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  }, []);

  const handleParticipantUpdate = useCallback((updatedRoom) => {
    console.log("Participants update received:", updatedRoom.participants);
    setParticipants(updatedRoom.participants || []);
    setRoom(updatedRoom); // Update room details which might include participant count
  }, []);

  const { isConnected, sendMessage } = useChatWebSocket(
    roomId,
    handleNewMessage,
    handleParticipantUpdate
  );

  const fetchRoomData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const roomDetails = await getChatRoomDetails(roomId);
      setRoom(roomDetails);
      setParticipants(roomDetails.participants || []);

      const messageHistory = await getMessageHistory(roomId);
      // Messages typically come in reverse chronological order, reverse for display
      setMessages(messageHistory.reverse());
    } catch (err) {
      setError('Failed to load chat room data.');
      console.error(err);
      navigate('/'); // Redirect if room not found or access denied
    } finally {
      setLoading(false);
    }
  }, [roomId, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRoomData();
    }
  }, [fetchRoomData, isAuthenticated]);

  const handleLeaveRoom = async () => {
    if (!user) return;
    try {
      await leaveChatRoom(roomId);
      navigate('/');
    } catch (err) {
      setError('Failed to leave room.');
      console.error(err);
    }
  };

  if (loading) return <div className="text-center text-lg mt-10">Loading chat room...</div>;
  if (error) return <div className="text-center text-red-500 text-lg mt-10">{error}</div>;
  if (!room || !user) return <div className="text-center text-lg mt-10">Chat room not found or user not loaded.</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="flex flex-col flex-grow">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md">
          <h2 className="text-2xl font-bold">{room.name}</h2>
          <div className="flex items-center space-x-3">
             <span className={`text-sm ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                {isConnected ? 'Real-time Connected' : 'Disconnected'}
             </span>
             <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-white font-semibold transition duration-300"
             >
                Leave Room
             </button>
          </div>
        </div>
        <ChatWindow messages={messages} currentUser={user} />
        <MessageInput onSendMessage={sendMessage} disabled={!isConnected} />
      </div>
      <UserList users={participants} />
    </div>
  );
};

export default ChatPage;