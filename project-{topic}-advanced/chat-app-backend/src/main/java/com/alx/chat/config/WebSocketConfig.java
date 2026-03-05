```java
package com.alx.chat.config;

import com.alx.chat.filter.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import static com.alx.chat.util.JwtUtil.extractToken;
import static com.alx.chat.util.JwtUtil.extractUsername;
import static com.alx.chat.util.JwtUtil.validateToken;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99) // Ensures our interceptor runs before Spring Security's
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final UserDetailsService userDetailsService;
    private final String jwtSecret; // Injected from application.yml

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefix for messages sent to the broker (client subscribes to these)
        config.enableSimpleBroker("/topic", "/queue"); // /topic for public messages, /queue for private
        // Prefix for messages from clients to the application (server-side handlers)
        config.setApplicationDestinationPrefixes("/app");
        // Enables user-specific destinations
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint for clients to connect to.
        // `withSockJS()` is for fallback options for browsers that don't support WebSockets.
        registry.addEndpoint("/websocket")
                .setAllowedOriginPatterns("http://localhost:3000", "http://127.0.0.1:3000") // Allow frontend origin
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // Authenticate CONNECT and SUBSCRIBE frames
                if (accessor != null && (StompCommand.CONNECT.equals(accessor.getCommand()) || StompCommand.SUBSCRIBE.equals(accessor.getCommand()))) {
                    String authToken = accessor.getFirstNativeHeader("Authorization");

                    if (authToken != null && authToken.startsWith("Bearer ")) {
                        String jwt = authToken.substring(7);
                        try {
                            String username = extractUsername(jwt, jwtSecret);
                            if (username != null && validateToken(jwt, username, jwtSecret)) {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                Authentication authentication = new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());
                                accessor.setUser(authentication); // Set the authenticated user in the WebSocket session
                                SecurityContextHolder.getContext().setAuthentication(authentication); // Also set in security context
                            }
                        } catch (Exception e) {
                            // Log error, token invalid
                            System.err.println("WebSocket authentication failed: " + e.getMessage());
                        }
                    }
                }
                return message;
            }
        });
    }
}

```