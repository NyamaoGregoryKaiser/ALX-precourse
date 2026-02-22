```java
package com.alx.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker
        // Messages destined for /topic or /queue will be routed to the broker
        config.enableSimpleBroker("/topic", "/user");

        // Prefix for clients to send messages to the server (e.g., /app/chat.sendMessage)
        config.setApplicationDestinationPrefixes("/app");

        // Prefix for user-specific queues (e.g., /user/queue/messages)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the /ws/chat endpoint, enabling SockJS fallback options for browsers that don't support WebSockets
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("*") // Allow all origins for development, restrict in production
                .withSockJS();
    }
}
```