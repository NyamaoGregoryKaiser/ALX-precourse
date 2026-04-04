```typescript
import { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext'; // Assuming SocketContext is exported from here

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};
```