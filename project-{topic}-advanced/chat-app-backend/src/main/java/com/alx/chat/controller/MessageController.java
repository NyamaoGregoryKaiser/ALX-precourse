```java
package com.alx.chat.controller;

import com.alx.chat.dto.chat.ChatMessage;
import com.alx.chat.service.MessageService;
import com.alx.chat.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController // For REST endpoints (message history)
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Message Management", description = "Operations related to chat messages and history")
public class MessageController {

    private final MessageService messageService;
    private final UserService userService; // To get user ID from UserDetails
    private final SimpMessagingTemplate messagingTemplate; // For sending WebSocket messages

    private Long getUserId(Principal principal) {
        // In WebSocket context, principal is usually a UsernamePasswordAuthenticationToken (from WebSocketConfig)
        return userService.getUserByUsername(principal.getName()).getId();
    }

    // REST endpoint for chat history
    @GetMapping("/room/{roomId}")
    @Operation(summary = "Get chat history for a room",
            description = "Retrieves a paginated history of messages for a specific chat room.")
    public ResponseEntity<Page<ChatMessage>> getChatHistory(@Parameter(description = "ID of the room") @PathVariable Long roomId,
                                                            @Parameter(description = "Pagination information") Pageable pageable) {
        return ResponseEntity.ok(messageService.getChatHistory(roomId, pageable));
    }

    // WebSocket endpoint for sending messages
    // Messages sent to /app/chat/room/{roomId} will be handled here
    @Controller // WebSocket methods need @Controller, not @RestController
    @RequiredArgsConstructor
    public class WebSocketChatController {

        private final MessageService messageService;
        private final UserService userService;
        private final SimpMessagingTemplate messagingTemplate;

        private Long getUserId(Principal principal) {
            // In WebSocket context, principal is usually a UsernamePasswordAuthenticationToken (from WebSocketConfig)
            return userService.getUserByUsername(principal.getName()).getId();
        }

        @MessageMapping("/chat/room/{roomId}") // Client sends to /app/chat/room/{roomId}
        @Operation(summary = "Send a message to a chat room (WebSocket)",
                description = "Sends a new message to the specified chat room. Messages are broadcasted to all room members.")
        public void sendMessage(@Parameter(description = "ID of the target chat room") @DestinationVariable Long roomId,
                                @Parameter(description = "Message content") @Payload String messageContent,
                                Principal principal) {
            Long senderId = getUserId(principal);
            ChatMessage savedMessage = messageService.saveMessage(senderId, roomId, messageContent);

            // Broadcast the message to all subscribers of /topic/room/{roomId}
            messagingTemplate.convertAndSend("/topic/room/" + roomId, savedMessage);
        }
    }
}
```