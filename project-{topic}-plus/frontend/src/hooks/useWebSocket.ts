```typescript
import { useContext } from 'react';
import { WebSocketContext } from 'context/WebSocketContext';
import { WebSocketContextType } from 'types';

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
```