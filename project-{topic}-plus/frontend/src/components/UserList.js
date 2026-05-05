import React from 'react';

const UserList = ({ users }) => {
  return (
    <div className="w-full lg:w-1/4 bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Participants ({users.length})</h3>
      {users.length === 0 ? (
        <p className="text-gray-500">No participants yet.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="flex items-center p-2 bg-gray-50 rounded-md">
              <span
                className={`w-3 h-3 rounded-full mr-2 ${
                  user.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'
                }`}
              ></span>
              <span className="text-gray-800">{user.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;