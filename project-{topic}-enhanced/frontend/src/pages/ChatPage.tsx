```tsx
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from 'contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axiosInstance from 'api/axiosInstance';
import { ChatRoom as ChatRoomType } from 'types';
import ChatRoom from 'components/ChatRoom';

const ChatPageContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f5f7fb;
`;

const Sidebar = styled.div`
  width: 300px;
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
`;

const UserInfo = styled.div`
  margin-bottom: 30px;
  text-align: center;
  h3 {
    margin: 0;
    font-size: 1.5rem;
  }
  p {
    margin: 5px 0 0;
    font-size: 0.9rem;
    color: #bdc3c7;
  }
`;

const LogoutButton = styled.button`
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: auto; /* Push to bottom */
  &:hover {
    background-color: #c0392b;
  }
`;

const ChatRoomList = styled.ul`
  list-style: none;
  padding: 0;
  flex-grow: 1;
  overflow-y: auto;
`;

const ChatRoomItem = styled.li<{ isSelected: boolean }>`
  padding: 15px;
  margin-bottom: 10px;
  background-color: ${(props) => (props.isSelected ? '#34495e' : '#3d5269')};
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: #34495e;
  }

  h4 {
    margin: 0;
    font-size: 1.1rem;
  }
  p {
    margin: 5px 0 0;
    font-size: 0.85rem;
    color: #ccc;
  }
  .last-message {
    font-style: italic;
    color: #bdc3c7;
  }
  .last-message-time {
    font-size: 0.75rem;
    color: #95a5a6;
    text-align: right;
  }
`;

const MainContent = styled.div`
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  flex-direction: column;
`;

const CreateRoomForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  width: 100%;
  max-width: 400px;

  input, textarea {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  button {
    background-color: #27ae60;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    &:hover {
      background-color: #219d54;
    }
    &:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  }
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  font-size: 0.9rem;
`;

const EmptyChatState = styled.div`
  text-align: center;
  color: #7f8c8d;
  font-size: 1.2rem;
`;

const ChatPage: React.FC = () => {
  const { user, isAuthenticated, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState<ChatRoomType[]>([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoomType | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [createRoomLoading, setCreateRoomLoading] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchChatRooms = async () => {
    try {
      const response = await axiosInstance.get('/chats');
      setChatRooms(response.data.data.chatRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchChatRooms();
    }
  }, [isAuthenticated]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setCreateRoomLoading(true);
    setCreateRoomError(null);
    try {
      const response = await axiosInstance.post('/chats', {
        name: newRoomName,
        description: newRoomDescription.trim() || undefined,
      });
      setChatRooms((prev) => [response.data.data.chatRoom, ...prev]);
      setNewRoomName('');
      setNewRoomDescription('');
      setSelectedChatRoom(response.data.data.chatRoom); // Auto-select new room
    } catch (error: any) {
      setCreateRoomError(error.response?.data?.message || 'Failed to create chat room.');
      console.error('Error creating chat room:', error);
    } finally {
      setCreateRoomLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated || !user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <ChatPageContainer>
      <Sidebar>
        <UserInfo>
          <h3>{user.username}</h3>
          <p>{user.email}</p>
        </UserInfo>

        <CreateRoomForm onSubmit={handleCreateRoom}>
          <h4>Create New Chat Room</h4>
          <input
            type="text"
            placeholder="Room Name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            required
            disabled={createRoomLoading}
          />
          <textarea
            placeholder="Description (optional)"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            rows={2}
            disabled={createRoomLoading}
          />
          {createRoomError && <ErrorMessage>{createRoomError}</ErrorMessage>}
          <button type="submit" disabled={createRoomLoading || !newRoomName.trim()}>
            {createRoomLoading ? 'Creating...' : 'Create Room'}
          </button>
        </CreateRoomForm>

        <h4>Your Chat Rooms</h4>
        <ChatRoomList>
          {chatRooms.length === 0 ? (
            <p>No chat rooms. Create one above!</p>
          ) : (
            chatRooms.map((room) => (
              <ChatRoomItem
                key={room.id}
                isSelected={selectedChatRoom?.id === room.id}
                onClick={() => setSelectedChatRoom(room)}
              >
                <h4>{room.name}</h4>
                {room.lastMessage && (
                  <>
                    <p className="last-message">
                      {room.lastMessage.senderUsername}: {room.lastMessage.content}
                    </p>
                    <p className="last-message-time">
                      {new Date(room.lastMessage.createdAt).toLocaleDateString()} {new Date(room.lastMessage.createdAt).toLocaleTimeString()}
                    </p>
                  </>
                )}
              </ChatRoomItem>
            ))
          )}
        </ChatRoomList>

        <LogoutButton onClick={logout}>Logout</LogoutButton>
      </Sidebar>

      <MainContent>
        {selectedChatRoom ? (
          <ChatRoom chatRoom={selectedChatRoom} />
        ) : (
          <EmptyChatState>
            <p>Select a chat room or create a new one to start chatting!</p>
          </EmptyChatState>
        )}
      </MainContent>
    </ChatPageContainer>
  );
};

export default ChatPage;
```