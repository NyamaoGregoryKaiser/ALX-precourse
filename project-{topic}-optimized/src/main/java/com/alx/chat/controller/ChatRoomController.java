```java
package com.alx.chat.controller;

import com.alx.chat.dto.ChatRoomDTO;
import com.alx.chat.dto.UserDTO;
import com.alx.chat.service.ChatRoomService;
import com.alx.chat.service.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/rooms")
@Slf4j
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    public ChatRoomController(ChatRoomService chatRoomService) {
        this.chatRoomService = chatRoomService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ChatRoomDTO> createChatRoom(@Valid @RequestBody ChatRoomDTO chatRoomDTO,
                                                      @AuthenticationPrincipal UserDetailsImpl currentUser) {
        log.info("Request to create chat room: {}", chatRoomDTO.getName());
        ChatRoomDTO createdRoom = chatRoomService.createChatRoom(chatRoomDTO, currentUser.getId());
        return new ResponseEntity<>(createdRoom, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ChatRoomDTO> getChatRoomById(@PathVariable Long id) {
        log.debug("Request to get chat room by ID: {}", id);
        ChatRoomDTO chatRoom = chatRoomService.getChatRoomById(id);
        return ResponseEntity.ok(chatRoom);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ChatRoomDTO>> getAllChatRooms() {
        log.debug("Request to get all chat rooms");
        List<ChatRoomDTO> chatRooms = chatRoomService.getAllChatRooms();
        return ResponseEntity.ok(chatRooms);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @chatRoomService.getChatRoomById(#id).creator.id == authentication.principal.id")
    public ResponseEntity<ChatRoomDTO> updateChatRoom(@PathVariable Long id, @Valid @RequestBody ChatRoomDTO chatRoomDTO) {
        log.info("Request to update chat room with ID: {}", id);
        ChatRoomDTO updatedRoom = chatRoomService.updateChatRoom(id, chatRoomDTO);
        return ResponseEntity.ok(updatedRoom);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @chatRoomService.getChatRoomById(#id).creator.id == authentication.principal.id")
    public ResponseEntity<Void> deleteChatRoom(@PathVariable Long id) {
        log.info("Request to delete chat room with ID: {}", id);
        chatRoomService.deleteChatRoom(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/{roomId}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @chatRoomService.getChatRoomById(#roomId).creator.id == authentication.principal.id")
    public ResponseEntity<String> addMember(@PathVariable Long roomId, @PathVariable Long userId) {
        log.info("Request to add user ID {} to room ID {}", userId, roomId);
        chatRoomService.addMemberToChatRoom(roomId, userId);
        return ResponseEntity.ok("User added to chat room successfully.");
    }

    @DeleteMapping("/{roomId}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @chatRoomService.getChatRoomById(#roomId).creator.id == authentication.principal.id or #userId == authentication.principal.id")
    public ResponseEntity<String> removeMember(@PathVariable Long roomId, @PathVariable Long userId) {
        log.info("Request to remove user ID {} from room ID {}", userId, roomId);
        chatRoomService.removeMemberFromChatRoom(roomId, userId);
        return ResponseEntity.ok("User removed from chat room successfully.");
    }

    @GetMapping("/{roomId}/members")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Set<UserDTO>> getRoomMembers(@PathVariable Long roomId) {
        log.debug("Request to get members for room ID: {}", roomId);
        Set<UserDTO> members = chatRoomService.getChatRoomMembers(roomId);
        return ResponseEntity.ok(members);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN') and (#userId == authentication.principal.id or hasRole('ADMIN'))")
    public ResponseEntity<List<ChatRoomDTO>> getChatRoomsForUser(@PathVariable Long userId) {
        log.debug("Request to get chat rooms for user ID: {}", userId);
        List<ChatRoomDTO> rooms = chatRoomService.getChatRoomsForUser(userId);
        return ResponseEntity.ok(rooms);
    }
}
```