```java
package com.alx.chat.config;

import com.alx.chat.security.WebSocketAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for STOMP messaging.
 * Enables a message broker for real-time communication.
 */
@Configuration
@EnableWebSocketMessageBroker // Enables WebSocket message handling
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;

    /**
     * Configures the message broker.
     * Messages from clients to the server are prefixed with `/app`.
     * Messages from the server to clients are prefixed with `/topic` (for public messages)
     * and `/user` (for private messages).
     * @param registry MessageBrokerRegistry to configure.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable a simple in-memory broker
        registry.enableSimpleBroker("/topic", "/user");
        // Prefix for client-to-server messages that are routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");
        // Prefix for user-specific queue destinations
        registry.setUserDestinationPrefix("/user");
    }

    /**
     * Registers STOMP endpoints.
     * The `/websocket` endpoint is used for clients to connect.
     * It also configures CORS for WebSocket connections.
     * @param registry StompEndpointRegistry to configure.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/websocket")
                .setAllowedOriginPatterns("http://localhost:3000", "http://127.0.0.1:3000") // Frontend URL
                .withSockJS(); // Fallback to SockJS for browsers that don't support WebSockets
    }

    /**
     * Configures the client inbound channel.
     * Adds an interceptor to authenticate WebSocket connections based on JWT.
     * @param registration ChannelRegistration to configure.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthChannelInterceptor);
    }
}
```