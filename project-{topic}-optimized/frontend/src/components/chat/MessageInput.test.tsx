```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageInput from './MessageInput';

describe('MessageInput', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  test('renders the input field and send button', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  test('updates the input value when typing', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;

    fireEvent.change(inputElement, { target: { value: 'Hello world' } });
    expect(inputElement.value).toBe('Hello world');
  });

  test('calls onSendMessage with message content and clears input on button click', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(inputElement, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    expect(inputElement.value).toBe('');
  });

  test('calls onSendMessage with message content and clears input on Enter key press', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;

    fireEvent.change(inputElement, { target: { value: 'Another test' } });
    fireEvent.keyPress(inputElement, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    expect(mockOnSendMessage).toHaveBeenCalledWith('Another test');
    expect(inputElement.value).toBe('');
  });

  test('does not call onSendMessage if input is empty', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.click(sendButton);
    expect(mockOnSendMessage).not.toHaveBeenCalled();

    const inputElement = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    fireEvent.keyPress(inputElement, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  test('does not call onSendMessage if input is only whitespace', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    const inputElement = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(inputElement, { target: { value: '   ' } });
    fireEvent.click(sendButton);
    expect(mockOnSendMessage).not.toHaveBeenCalled();

    fireEvent.keyPress(inputElement, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });
});
```

### Integration Tests (Backend - Spring Boot Test, Testcontainers)

Integration tests will use a real PostgreSQL database instance managed by Testcontainers.