```java
package com.alx.chat.controller;

import com.alx.chat.dto.MessageDTO;
import com.alx.chat.service.MessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/messages")
@Slf4j
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/room/{roomId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Additional check for room membership can be added in service layer
    public ResponseEntity<List<MessageDTO>> getMessagesByRoomId(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        log.debug("Request to get messages for room ID: {} (page: {}, size: {})", roomId, page, size);
        List<MessageDTO> messages = messageService.getMessagesByRoomId(roomId, page, size);
        return ResponseEntity.ok(messages);
    }
}
```