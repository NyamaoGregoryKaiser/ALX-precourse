```java
package com.alx.chat.controller;

import com.alx.chat.dto.MessageDTO;
import com.alx.chat.service.MessageService;
import com.alx.chat.service.UserDetailsImpl;
import com.alx.chat.util.ChatConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Objects;

@Controller
@Slf4j
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messagingTemplate;
    private final MessageService messageService;

    public WebSocketEventListener(SimpMessageSendingOperations messagingTemplate, MessageService messageService) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        log.info("Received a new web socket connection: {}", event.getMessage().getHeaders().get("simpSessionId"));
        // Potentially handle user presence here, e.g., broadcast 'user connected'
        // Requires extracting username from security context or session attributes
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username != null) {
            log.info("User Disconnected: {}", username);
            // Broadcast user has left
            MessageDTO chatMessage = new MessageDTO();
            // chatMessage.setType(ChatConstants.MessageType.LEAVE); // If you add message types
            chatMessage.setSender(null); // Or a system user
            chatMessage.setContent(username + " left the chat");
            // You might need a way to know which room the user was in to send to that room.
            // For simplicity, we broadcast to a general topic or handle this more robustly client-side.
             // messagingTemplate.convertAndSend("/topic/public", chatMessage);
        }
    }

    @MessageMapping("/chat.sendMessage")
    // @SendTo("/topic/public") // For public broadcast
    public void sendMessage(@Payload MessageDTO chatMessage, @AuthenticationPrincipal UserDetailsImpl currentUser) {
        log.info("Received message from user {}: {}", currentUser.getUsername(), chatMessage.getContent());
        // Set sender from authenticated user
        chatMessage.setSender(new com.alx.chat.dto.UserDTO(currentUser.getId(), currentUser.getUsername(), currentUser.getEmail(), null, null, null));

        // Save message to DB
        MessageDTO savedMessage = messageService.saveMessage(chatMessage, currentUser.getId());

        // Send to specific room's topic
        messagingTemplate.convertAndSend(String.format("/topic/rooms/%d", savedMessage.getRoomId()), savedMessage);
    }

    @MessageMapping("/chat.addUser")
    public void addUser(@Payload MessageDTO chatMessage, SimpMessageHeaderAccessor headerAccessor, @AuthenticationPrincipal UserDetailsImpl currentUser) {
        // Add username in web socket session
        Objects.requireNonNull(headerAccessor.getSessionAttributes()).put("username", currentUser.getUsername());
        log.info("User added to chat: {}", currentUser.getUsername());

        chatMessage.setSender(new com.alx.chat.dto.UserDTO(currentUser.getId(), currentUser.getUsername(), currentUser.getEmail(), null, null, null));
        // chatMessage.setType(ChatConstants.MessageType.JOIN); // If you add message types
        chatMessage.setContent(currentUser.getUsername() + " joined!");

        // Assuming a general public topic or a room specific entry point.
        // If joining a specific room, the client should send to a room-specific addUser endpoint
        // For simplicity, this example just logs the user added.
        // To send to a specific room, the DTO would need roomId.
        // messagingTemplate.convertAndSend("/topic/public", chatMessage);
    }
}
```