```java
package com.alx.chat.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Channel Interceptor for WebSocket STOMP messages to handle JWT authentication.
 * This intercepts messages before they reach the message broker to authenticate users.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Intercepts messages before they are sent to the channel.
     * This is where JWT token is extracted and validated for WebSocket connections.
     *
     * @param message The message to be sent.
     * @param channel The channel to which the message is being sent.
     * @return The message, possibly modified, or null if the message should be dropped.
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // Only authenticate CONNECT frames for STOMP
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authToken = accessor.getFirstNativeHeader("Authorization");

            if (authToken != null && authToken.startsWith("Bearer ")) {
                String jwt = authToken.substring(7);
                try {
                    if (jwtTokenProvider.validateToken(jwt)) {
                        String username = jwtTokenProvider.getUsernameFromToken(jwt);
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                        // Create an authenticated token and set it in the message header
                        // This authentication will be available in @Controller and @MessageMapping methods
                        Authentication authentication = jwtTokenProvider.getAuthentication(jwt, userDetails);
                        accessor.setUser(authentication); // Set the authenticated user for the WebSocket session
                        log.info("WebSocket connection authenticated for user: {}", username);
                    } else {
                        log.warn("Invalid JWT token for WebSocket connection.");
                        // This will cause an authentication failure, and the client will not be able to connect
                        // Or, depending on WebSocketSecurityConfig, it might be allowed but unauthenticated.
                        // Here, we effectively deny connection by not setting a user.
                    }
                } catch (Exception e) {
                    log.error("Error authenticating WebSocket connection: {}", e.getMessage());
                    // Clear user context if any error
                    accessor.setUser(null);
                }
            } else {
                log.warn("No JWT token provided for WebSocket connection or invalid format.");
                // Optionally, you could throw new MessageDeliveryException("Unauthorized") to explicitly reject.
            }
        }
        // For other commands (SEND, SUBSCRIBE, UNSUBSCRIBE), the user from the CONNECT frame
        // will already be associated with the session. No explicit re-authentication needed.

        return message;
    }
}
```