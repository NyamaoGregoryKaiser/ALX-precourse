package com.alxchat.websocket;

import com.alxchat.model.User;
import com.alxchat.model.UserStatus;
import com.alxchat.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserService userService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            String username = principal.getName();
            log.info("WebSocket connected: {}", username);
            // Update user status to ONLINE
            User user = userService.getUserByUsername(username);
            if (user != null) {
                userService.updateUserStatus(user.getId(), UserStatus.ONLINE);
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            String username = principal.getName();
            log.info("WebSocket disconnected: {}", username);
            // Update user status to OFFLINE
            User user = userService.getUserByUsername(username);
            if (user != null) {
                userService.updateUserStatus(user.getId(), UserStatus.OFFLINE);
            }
        }
    }
}