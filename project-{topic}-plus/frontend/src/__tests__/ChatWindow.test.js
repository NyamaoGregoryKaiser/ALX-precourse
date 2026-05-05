import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWindow from '../components/ChatWindow';

describe('ChatWindow', () => {
  const currentUser = { id: 1, username: 'Alice' };

  const mockMessages = [
    {
      id: 1,
      sender: { id: 1, username: 'Alice' },
      content: 'Hi Bob!',
      timestamp: '2023-01-01T10:00:00Z',
    },
    {
      id: 2,
      sender: { id: 2, username: 'Bob' },
      content: 'Hello Alice!',
      timestamp: '2023-01-01T10:01:00Z',
    },
    {
      id: 3,
      sender: { id: 1, username: 'Alice' },
      content: 'How are you?',
      timestamp: '2023-01-01T10:02:00Z',
    },
  ];

  test('renders "No messages yet" when messages array is empty', () => {
    render(<ChatWindow messages={[]} currentUser={currentUser} />);
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  test('renders messages correctly with sender names', () => {
    render(<ChatWindow messages={mockMessages} currentUser={currentUser} />);

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Hi Bob!')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Hello Alice!')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();

    // Check if the "You" label is used for the current user's messages
    const ownMessages = screen.getAllByText(/hi bob!/i);
    expect(ownMessages.length).toBe(1); // Ensure only one instance of 'Hi Bob!' message
  });

  test('renders message content correctly', () => {
    render(<ChatWindow messages={mockMessages} currentUser={currentUser} />);
    expect(screen.getByText('Hi Bob!')).toBeInTheDocument();
    expect(screen.getByText('Hello Alice!')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });

  test('renders timestamps correctly', () => {
    render(<ChatWindow messages={mockMessages} currentUser={currentUser} />);
    // Check for a specific time format, e.g., "10:00:00 AM" or similar
    // This might vary based on locale, so checking for parts is safer
    expect(screen.getByText(/10:00:/i)).toBeInTheDocument();
    expect(screen.getByText(/10:01:/i)).toBeInTheDocument();
    expect(screen.getByText(/10:02:/i)).toBeInTheDocument();
  });

  test('applies correct styling for sender and receiver messages', () => {
    const { container } = render(<ChatWindow messages={mockMessages} currentUser={currentUser} />);

    // Messages from current user (Alice) should be 'justify-end' and 'bg-blue-500'
    const aliceMessages = container.querySelectorAll('.justify-end');
    expect(aliceMessages.length).toBe(2); // Two messages from Alice
    aliceMessages.forEach(msg => {
      expect(msg.querySelector('.bg-blue-500')).toBeInTheDocument();
    });

    // Messages from other users (Bob) should be 'justify-start' and 'bg-gray-200'
    const bobMessages = container.querySelectorAll('.justify-start');
    expect(bobMessages.length).toBe(1); // One message from Bob
    bobMessages.forEach(msg => {
      expect(msg.querySelector('.bg-gray-200')).toBeInTheDocument();
    });
  });
});