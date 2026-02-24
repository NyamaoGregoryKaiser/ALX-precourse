```java
package com.alx.chat.controller;

import com.alx.chat.dto.MessageDto;
import com.alx.chat.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller for real-time chat messages via WebSockets and REST for message history.
 * @MessageMapping handles incoming STOMP messages.
 * @RestController handles REST endpoints for message history.
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate; // Used to send messages to WebSocket clients
    private final MessageService messageService;

    /**
     * Handles incoming STOMP messages to `/app/chat/{channelId}`.
     * Saves the message and broadcasts it to all subscribers of the specific channel topic.
     *
     * @param channelId The ID of the channel where the message is sent.
     * @param messageDto The message content.
     * @param userDetails Authenticated user details of the sender.
     */
    @MessageMapping("/chat/{channelId}")
    @PreAuthorize("@channelService.isUserMemberOfChannel(#channelId, #userDetails.username)") // Ensure user is a member
    public void sendMessage(@DestinationVariable Long channelId,
                            MessageDto messageDto,
                            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("Received message from user {} in channel {}: {}", userDetails.getUsername(), channelId, messageDto.getContent());

        // Set sender and timestamp for the message
        messageDto.setSenderUsername(userDetails.getUsername());
        messageDto.setTimestamp(LocalDateTime.now());
        messageDto.setChannelId(channelId); // Ensure channel ID is set for persistence

        // Save the message to the database
        MessageDto savedMessage = messageService.saveMessage(messageDto);

        // Broadcast the message to all subscribers of the channel topic
        // Clients subscribe to /topic/channels/{channelId}
        messagingTemplate.convertAndSend("/topic/channels/" + channelId, savedMessage);
        log.info("Message sent to /topic/channels/{} by {}: {}", channelId, userDetails.getUsername(), savedMessage.getContent());
    }

    /**
     * Retrieves the chat message history for a specific channel.
     *
     * @param channelId The ID of the channel.
     * @param userDetails Authenticated user details.
     * @return ResponseEntity with a list of MessageDto.
     */
    @GetMapping("/channel/{channelId}")
    @PreAuthorize("@channelService.isUserMemberOfChannel(#channelId, #userDetails.username)")
    public ResponseEntity<List<MessageDto>> getMessageHistory(@PathVariable Long channelId,
                                                              @AuthenticationPrincipal UserDetails userDetails) {
        log.debug("Fetching message history for channel ID: {} by user: {}", channelId, userDetails.getUsername());
        List<MessageDto> messages = messageService.getMessagesByChannel(channelId);
        log.debug("Fetched {} messages for channel ID: {}", messages.size(), channelId);
        return ResponseEntity.ok(messages);
    }
}
```