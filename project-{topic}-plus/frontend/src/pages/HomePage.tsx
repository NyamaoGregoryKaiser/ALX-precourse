```typescript
import React, { useState } from 'react';
import ConversationList from '../components/ConversationList';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { useAuth } from '../hooks/useAuth';
import * as conversationService from '../services/conversation';
import { Conversation, User } from '../types';
import './HomePage.css';

const HomePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState<boolean>(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const messageListRef = React.useRef<HTMLDivElement>(null);

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setConversationLoading(true);
    setConversationError(null);
    try {
      const conv = await conversationService.getConversationById(conversationId);
      setCurrentConversation(conv);
    } catch (err: any) {
      setConversationError(err.message || 'Failed to load conversation.');
      setCurrentConversation(null);
    } finally {
      setConversationLoading(false);
    }
  };

  const handleSendMessage = () => {
    // Optionally re-fetch messages or just scroll to bottom
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  if (authLoading) {
    return <div className="homepage-loading">Loading user data...</div>;
  }

  if (!user) {
    return <div className="homepage-unauthenticated">Please log in to view chats.</div>;
  }

  return (
    <div className="homepage-container">
      <div className="conversation-list-pane">
        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      </div>
      <div className="chat-pane">
        {selectedConversationId ? (
          <>
            <div className="chat-header">
              {conversationLoading ? (
                <span>Loading chat...</span>
              ) : conversationError ? (
                <span className="error-message">Error: {conversationError}</span>
              ) : currentConversation ? (
                <>
                  <h3>{currentConversation.name || (currentConversation.participants.find(p => p.id !== user.id)?.username || 'Direct Message')}</h3>
                  <div className="participants-list">
                    {currentConversation.participants
                      .filter(p => p.id !== user.id) // Exclude current user from display in header if DM
                      .map(p => (
                        <span key={p.id} className={`participant-name ${p.status?.toLowerCase()}`}>
                          {p.username} ({p.status})
                        </span>
                      ))}
                  </div>
                </>
              ) : (
                <span>Select a conversation to start chatting.</span>
              )}
            </div>
            {currentConversation && (
              <div className="message-area" ref={messageListRef}>
                <MessageList
                  conversationId={selectedConversationId}
                  participants={currentConversation.participants.map(p => ({ ...p, status: p.status || 'OFFLINE' })) as User[]}
                />
                <MessageInput
                  conversationId={selectedConversationId}
                  onSendMessage={handleSendMessage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="no-conversation-selected">
            <p>Select a conversation from the left pane or start a new one to begin chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
```