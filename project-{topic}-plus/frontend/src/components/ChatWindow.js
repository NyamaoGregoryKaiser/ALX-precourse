import React, { useEffect, useRef } from 'react';

const ChatWindow = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto rounded-lg shadow-inner max-h-[calc(100vh-250px)]">
      {messages.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No messages yet. Start the conversation!</p>
      ) : (
        messages.map((msg, index) => (
          <div
            key={msg.id || index} // Use msg.id for stability, fallback to index
            className={`flex mb-4 ${
              msg.sender.username === currentUser.username ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow-md ${
                msg.sender.username === currentUser.username
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="font-semibold text-sm mb-1">
                {msg.sender.username === currentUser.username ? 'You' : msg.sender.username}
              </div>
              <p className="text-base break-words">{msg.content}</p>
              <div className="text-xs text-right opacity-75 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;