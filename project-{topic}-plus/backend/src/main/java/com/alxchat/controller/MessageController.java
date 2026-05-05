package com.alxchat.controller;

import com.alxchat.dto.MessageDTO;
import com.alxchat.dto.NewMessageDTO;
import com.alxchat.model.User;
import com.alxchat.service.MessageService;
import com.alxchat.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Objects;

@Controller // For WebSocket @MessageMapping
@RestController // For REST endpoints
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final UserService userService;

    // REST endpoint to get message history
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<MessageDTO>> getMessageHistory(@PathVariable Long roomId,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "50") int size) {
        List<MessageDTO> messages = messageService.getMessageHistory(roomId, page, size);
        return ResponseEntity.ok(messages);
    }

    // WebSocket endpoint to send messages
    // Messages sent to /app/chat.sendMessage will be routed here
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload @Valid NewMessageDTO newMessageDTO, SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        if (principal == null) {
            // Handle unauthenticated WebSocket message, perhaps deny or log
            throw new RuntimeException("Unauthorized WebSocket message.");
        }
        String username = principal.getName();
        User sender = userService.getUserByUsername(username);
        // The service handles persistence and broadcasting to /topic/room/{roomId}/messages
        messageService.sendMessage(newMessageDTO, sender.getId());
    }
}