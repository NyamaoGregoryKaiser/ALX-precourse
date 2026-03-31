import { WS_BASE_URL, LOCAL_STORAGE_TOKEN_KEY } from '../utils/constants';

class WebSocketService {
  private websocket: WebSocket | null = null;
  private messageListeners: ((message: MessageEvent) => void)[] = [];
  private closeListeners: ((event: CloseEvent) => void)[] = [];
  private openListeners: ((event: Event) => void)[] = [];
  private currentChatId: number | null = null;
  private reconnectInterval: number | null = null;

  connect(chatId: number, token: string) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN && this.currentChatId === chatId) {
      console.log('Already connected to this chat.');
      return;
    }
    this.disconnect(); // Disconnect from previous chat if any

    const wsUrl = `${WS_BASE_URL}/${chatId}?token=${token}`;
    this.websocket = new WebSocket(wsUrl);
    this.currentChatId = chatId;

    this.websocket.onopen = (event) => {
      console.log('WebSocket connection opened:', event);
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
      this.openListeners.forEach(listener => listener(event));
    };

    this.websocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      this.messageListeners.forEach(listener => listener(event));
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      this.closeListeners.forEach(listener => listener(event));
      this.attemptReconnect(chatId, token);
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.websocket?.close(); // Force close to trigger onclose and reconnect
    };
  }

  disconnect() {
    if (this.websocket) {
      console.log('Disconnecting WebSocket...');
      this.websocket.close();
      this.websocket = null;
      this.currentChatId = null;
    }
    if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
    }
  }

  attemptReconnect(chatId: number, token: string, delay: number = 3000) {
    if (this.reconnectInterval) return; // Already attempting to reconnect
    console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
    this.reconnectInterval = setInterval(() => {
        if (!this.websocket || this.websocket.readyState === WebSocket.CLOSED) {
            console.log('Reconnecting...');
            this.connect(chatId, token);
        } else if (this.websocket.readyState === WebSocket.OPEN) {
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        }
    }, delay) as unknown as number; // Cast to number for clearInterval
  }

  // Not directly sending messages from frontend via WS in this model, but could be added
  // sendMessage(message: string) {
  //   if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
  //     this.websocket.send(message);
  //   } else {
  //     console.warn('WebSocket is not open to send message.');
  //   }
  // }

  addMessageListener(listener: (message: MessageEvent) => void) {
    this.messageListeners.push(listener);
  }

  removeMessageListener(listener: (message: MessageEvent) => void) {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  addOpenListener(listener: (event: Event) => void) {
    this.openListeners.push(listener);
  }

  removeOpenListener(listener: (event: Event) => void) {
    this.openListeners = this.openListeners.filter(l => l !== listener);
  }

  addCloseListener(listener: (event: CloseEvent) => void) {
    this.closeListeners.push(listener);
  }

  removeCloseListener(listener: (event: CloseEvent) => void) {
    this.closeListeners = this.closeListeners.filter(l => l !== listener);
  }

  getReadyState(): number | undefined {
    return this.websocket?.readyState;
  }
}

export const webSocketService = new WebSocketService();
```