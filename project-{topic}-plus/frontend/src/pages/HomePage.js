import React, { useEffect, useState, useCallback } from 'react';
import { getMyChatRooms, getAllChatRooms, joinChatRoom } from '../api/chat';
import ChatList from '../components/ChatList';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user, loadUser } = useAuth();
  const [myRooms, setMyRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const myRoomsData = await getMyChatRooms();
      setMyRooms(myRoomsData);

      const allRoomsData = await getAllChatRooms();
      setAllRooms(allRoomsData);
    } catch (err) {
      setError('Failed to fetch chat rooms.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRoomCreated = (newRoom) => {
    setMyRooms((prev) => [...prev, newRoom]);
    setAllRooms((prev) => [...prev, newRoom]);
    // Optionally redirect to the new room or show a success message
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await joinChatRoom(roomId);
      await fetchRooms(); // Re-fetch rooms to update 'my rooms' list
    } catch (err) {
      setError('Failed to join room.');
      console.error(err);
    }
  };

  if (loading) return <div className="text-center text-lg mt-10">Loading rooms...</div>;
  if (error) return <div className="text-center text-red-500 text-lg mt-10">{error}</div>;

  const availableRoomsToJoin = allRooms.filter(
    (room) => !myRooms.some((myRoom) => myRoom.id === room.id)
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ChatList title="My Chat Rooms" rooms={myRooms} onRoomCreated={handleRoomCreated} canCreate={true} />
      <div className="bg-white p-6 rounded-lg shadow-md w-full lg:w-2/3">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Available Rooms to Join</h2>
        {availableRoomsToJoin.length === 0 ? (
          <p className="text-gray-500">No other rooms to join.</p>
        ) : (
          <ul className="space-y-3">
            {availableRoomsToJoin.map((room) => (
              <li key={room.id}>
                <div className="block p-4 bg-gray-50 hover:bg-green-100 rounded-md transition duration-300 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                    <p className="text-sm text-gray-600">Created by: {room.creator.username}</p>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-300"
                  >
                    Join Room
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HomePage;