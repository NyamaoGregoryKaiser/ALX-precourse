import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = {}; // To manage active subscriptions
    this.websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:8080/websocket';
  }

  connect(jwtToken, onConnectCallback, onErrorCallback) {
    if (this.connected && this.client && this.client.connected) {
      console.log('STOMP client already connected.');
      onConnectCallback();
      return;
    }

    this.client = new Client({
      brokerURL: '', // Not used when using WebSocketFactory
      webSocketFactory: () => {
        // SockJS is used for fallback in browsers that don't support native WebSockets
        return new SockJS(this.websocketUrl);
      },
      connectHeaders: {
        Authorization: `Bearer ${jwtToken}`, // Pass JWT token for authentication
      },
      debug: (str) => {
        console.log('STOMP Debug: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.connected = true;
        console.log('Connected to WebSocket!');
        onConnectCallback();
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame);
        this.connected = false;
        if (onErrorCallback) onErrorCallback(frame);
      },
      onDisconnect: () => {
        this.connected = false;
        console.log('Disconnected from WebSocket');
      },
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
      this.subscriptions = {};
      console.log('STOMP client disconnected.');
    }
  }

  // Subscribe to a topic and store the subscription for later management
  subscribe(topic, callback) {
    if (!this.client || !this.client.connected) {
      console.error('STOMP client not connected, cannot subscribe.');
      return null;
    }
    const subscription = this.client.subscribe(topic, (message) => {
      callback(JSON.parse(message.body));
    });
    this.subscriptions[topic] = subscription;
    console.log(`Subscribed to topic: ${topic}`);
    return subscription;
  }

  unsubscribe(topic) {
    if (this.subscriptions[topic]) {
      this.subscriptions[topic].unsubscribe();
      delete this.subscriptions[topic];
      console.log(`Unsubscribed from topic: ${topic}`);
    } else {
      console.warn(`No active subscription found for topic: ${topic}`);
    }
  }

  send(destination, body) {
    if (!this.client || !this.client.connected) {
      console.error('STOMP client not connected, cannot send message.');
      return;
    }
    this.client.publish({ destination: destination, body: JSON.stringify(body) });
    console.log(`Sent message to ${destination}:`, body);
  }

  isConnected() {
    return this.connected;
  }
}

// Export a singleton instance
export const wsService = new WebSocketService();