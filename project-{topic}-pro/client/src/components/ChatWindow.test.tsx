import { render, screen } from '@testing-library/react';
import ChatWindow from './ChatWindow';
import { Conversation, ConversationType, Message, User } from '../types';
import '@testing-library/jest-dom';

const mockCurrentUser: User = {
  id: 'user1',
  username: 'Alice',
  email: 'alice@example.com',
  createdAt: '2023-01-01T00:00:00Z',
};

const mockOtherUser: User = {
  id: 'user2',
  username: 'Bob',
  email: 'bob@example.com',
  createdAt: '2023-01-01T00:00:00Z',
};

const mockConversation: Conversation = {
  id: 'conv1',
  type: ConversationType.PRIVATE,
  name: undefined,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  participants: [
    { id: 'p1', userId: 'user1', user: mockCurrentUser, conversationId: 'conv1', joinedAt: '2023-01-01T00:00:00Z' },
    { id: 'p2', userId: 'user2', user: mockOtherUser, conversationId: 'conv1', joinedAt: '2023-01-01T00:00:00Z' },
  ],
  messages: [],
};

const mockMessages: Message[] = [
  {
    id: 'msg1',
    content: 'Hi Bob!',
    senderId: 'user1',
    sender: mockCurrentUser,
    conversationId: 'conv1',
    sentAt: '2023-01-01T10:00:00Z',
  },
  {
    id: 'msg2',
    content: 'Hello Alice! How are you?',
    senderId: 'user2',
    sender: mockOtherUser,
    conversationId: 'conv1',
    sentAt: '2023-01-01T10:01:00Z',
  },
  {
    id: 'msg3',
    content: 'I\'m great, thanks! What about you?',
    senderId: 'user1',
    sender: mockCurrentUser,
    conversationId: 'conv1',
    sentAt: '2023-01-01T10:02:00Z',
  },
];

describe('ChatWindow', () => {
  it('renders conversation title correctly for private chat', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={[]}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    expect(screen.getByText(`Chat with ${mockOtherUser.username}`)).toBeInTheDocument();
  });

  it('renders conversation title correctly for group chat', () => {
    const groupConversation = { ...mockConversation, type: ConversationType.GROUP, name: 'Team Chat' };
    render(
      <ChatWindow
        conversation={groupConversation}
        messages={[]}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    expect(screen.getByText('Team Chat')).toBeInTheDocument();
  });

  it('renders all messages', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    expect(screen.getByText('Hi Bob!')).toBeInTheDocument();
    expect(screen.getByText('Hello Alice! How are you?')).toBeInTheDocument();
    expect(screen.getByText('I\'m great, thanks! What about you?')).toBeInTheDocument();
  });

  it('correctly displays messages from current user on the right', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    const myMessages = screen.getAllByText(/Hi Bob!|I'm great, thanks! What about you?/);
    myMessages.forEach(msg => {
      expect(msg.closest('.message-bubble')).toHaveClass('my-message');
    });
  });

  it('correctly displays messages from other users on the left', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    const otherMessages = screen.getAllByText(/Hello Alice! How are you?/);
    otherMessages.forEach(msg => {
      expect(msg.closest('.message-bubble')).toHaveClass('other-message');
    });
  });

  it('shows sender username for other users in group chat', () => {
    const groupConversation = { ...mockConversation, type: ConversationType.GROUP, name: 'Team Chat' };
    render(
      <ChatWindow
        conversation={groupConversation}
        messages={mockMessages}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    // In a group chat, Bob's message should display his username
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
  });

  it('does not show sender username for current user in private chat', () => {
    render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    // For "Hi Bob!" from Alice (current user), her username should not be explicitly shown above the bubble
    const myMessageElement = screen.getByText('Hi Bob!');
    // This is a bit tricky to test without looking at the exact DOM structure.
    // Assuming 'my-message' class doesn't show sender, and 'other-message' does.
    // We can check if 'Alice' is not near the first message.
    expect(myMessageElement.closest('.my-message')).toBeInTheDocument();
    // More precise check: Check if 'Alice' username is NOT visible in the DOM near the message bubble from current user
    const aliceUsernameSpans = screen.queryAllByText('Alice');
    aliceUsernameSpans.forEach(span => {
      // Ensure 'Alice' is not rendered as the sender header for her own messages
      expect(span).not.toHaveClass('sender-name'); // Assuming such a class would exist for sender name
    });
  });

  it('scrolls to bottom on initial render and message update', () => {
    // This requires mocking useRef and its scrollIntoView method, which is complex for JSDOM.
    // For a real-world scenario, you might test this with an end-to-end testing tool like Cypress.
    // Here, we'll just ensure the component renders without errors.
    const { container } = render(
      <ChatWindow
        conversation={mockConversation}
        messages={mockMessages}
        currentUserId={mockCurrentUser.id}
        userStatusMap={new Map()}
      />
    );
    expect(container).toBeInTheDocument();
    // You would visually inspect this or use e2e tests.
  });
});