package com.alxchat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker // Enables WebSocket message handling
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Defines the prefix for destinations filtered by the message broker.
        // E.g., clients subscribe to /topic/public or /user/{userId}/queue/messages
        config.enableSimpleBroker("/topic", "/user");
        // Defines the prefix for "application" destinations.
        // E.g., messages sent to /app/chat.sendMessage will be routed to @MessageMapping methods.
        config.setApplicationDestinationPrefixes("/app");
        // For user-specific destinations, this sets the prefix for the user queue.
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Registers the WebSocket endpoint "/websocket".
        // Clients connect to ws://localhost:8080/websocket
        registry.addEndpoint("/websocket")
                .setAllowedOriginPatterns("http://localhost:3000", "http://127.0.0.1:3000") // Allow frontend origin
                .withSockJS(); // Fallback for browsers that don't support WebSockets
    }
}