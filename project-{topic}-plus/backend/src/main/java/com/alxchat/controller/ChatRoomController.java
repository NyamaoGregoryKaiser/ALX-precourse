package com.alxchat.controller;

import com.alxchat.dto.ChatRoomDTO;
import com.alxchat.dto.CreateRoomDTO;
import com.alxchat.dto.UserDTO;
import com.alxchat.model.User;
import com.alxchat.service.ChatRoomService;
import com.alxchat.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatrooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<ChatRoomDTO> createChatRoom(@Valid @RequestBody CreateRoomDTO createRoomDTO,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        User creator = userService.getUserByUsername(userDetails.getUsername());
        ChatRoomDTO newRoom = chatRoomService.createChatRoom(createRoomDTO.getName(), creator.getId());
        return new ResponseEntity<>(newRoom, HttpStatus.CREATED);
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<String> joinChatRoom(@PathVariable Long roomId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        chatRoomService.joinChatRoom(roomId, user.getId());
        return ResponseEntity.ok("Successfully joined chat room.");
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<String> leaveChatRoom(@PathVariable Long roomId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        chatRoomService.leaveChatRoom(roomId, user.getId());
        return ResponseEntity.ok("Successfully left chat room.");
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<ChatRoomDTO> getChatRoom(@PathVariable Long roomId) {
        ChatRoomDTO room = chatRoomService.getChatRoomById(roomId);
        return ResponseEntity.ok(room);
    }

    @GetMapping
    public ResponseEntity<List<ChatRoomDTO>> getAllChatRooms() {
        List<ChatRoomDTO> rooms = chatRoomService.getAllChatRooms();
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/my-rooms")
    public ResponseEntity<List<ChatRoomDTO>> getMyChatRooms(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        List<ChatRoomDTO> rooms = chatRoomService.getChatRoomsForUser(user.getId());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/{roomId}/participants")
    public ResponseEntity<List<UserDTO>> getRoomParticipants(@PathVariable Long roomId) {
        Set<User> participants = chatRoomService.getRoomParticipants(roomId);
        List<UserDTO> participantDTOs = participants.stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(participantDTOs);
    }
}