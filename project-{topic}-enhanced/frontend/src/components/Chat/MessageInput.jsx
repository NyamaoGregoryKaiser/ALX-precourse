```javascript
import React, { useState, useRef, useEffect } from 'react';

const TYPING_TIMER_LENGTH = 3000; // 3 seconds

function MessageInput({ onSendMessage, onTypingStart, onTypingStop }) {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false); // To track if user is currently typing

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (!isTypingRef.current) {
      onTypingStart();
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
      isTypingRef.current = false;
    }, TYPING_TIMER_LENGTH);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTypingStop(); // Ensure typing stop is sent immediately after sending message
      isTypingRef.current = false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        onTypingStop(); // Send stop typing if component unmounts while typing
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form onSubmit={handleSubmit} className="message-input-container">
      <input
        type="text"
        className="message-input"
        placeholder="Type a message..."
        value={message}
        onChange={handleInputChange}
      />
      <button type="submit" className="message-send-button">Send</button>
    </form>
  );
}

export default MessageInput;
```