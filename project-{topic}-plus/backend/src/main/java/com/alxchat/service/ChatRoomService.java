package com.alxchat.service;

import com.alxchat.dto.ChatRoomDTO;
import com.alxchat.exception.ResourceNotFoundException;
import com.alxchat.exception.ValidationException;
import com.alxchat.model.ChatRoom;
import com.alxchat.model.RoomParticipant;
import com.alxchat.model.User;
import com.alxchat.repository.ChatRoomRepository;
import com.alxchat.repository.RoomParticipantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final RoomParticipantRepository roomParticipantRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate; // For sending WebSocket messages

    @Transactional
    public ChatRoomDTO createChatRoom(String roomName, Long creatorId) {
        User creator = userService.getUserById(creatorId);

        if (chatRoomRepository.findByName(roomName).isPresent()) {
            throw new ValidationException("Chat room with name '" + roomName + "' already exists.");
        }

        ChatRoom chatRoom = ChatRoom.builder()
                .name(roomName)
                .creator(creator)
                .build();
        chatRoom = chatRoomRepository.save(chatRoom);

        // Creator automatically joins the room
        joinChatRoom(chatRoom.getId(), creatorId);
        log.info("Chat room '{}' created by user {}", roomName, creator.getUsername());
        return ChatRoomDTO.fromEntityWithParticipants(
                chatRoomRepository.findByIdWithParticipants(chatRoom.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Room not found after creation")));
    }

    @Transactional
    @CacheEvict(value = "userRooms", key = "#userId") // Evict user's room list cache
    public RoomParticipant joinChatRoom(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        User user = userService.getUserById(userId);

        if (roomParticipantRepository.existsByRoomAndUser(room, user)) {
            throw new ValidationException("User " + user.getUsername() + " is already a participant in room " + room.getName());
        }

        RoomParticipant participant = RoomParticipant.builder()
                .room(room)
                .user(user)
                .build();
        participant = roomParticipantRepository.save(participant);

        // Notify room participants about the new member
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", ChatRoomDTO.fromEntityWithParticipants(
                chatRoomRepository.findByIdWithParticipants(roomId)
                        .orElseThrow(() -> new ResourceNotFoundException("Room not found after participant update"))));
        log.info("User {} joined room {}", user.getUsername(), room.getName());
        return participant;
    }

    @Transactional
    @CacheEvict(value = "userRooms", key = "#userId") // Evict user's room list cache
    public void leaveChatRoom(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        User user = userService.getUserById(userId);

        RoomParticipant participant = roomParticipantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new ValidationException("User is not a participant of this room."));

        roomParticipantRepository.delete(participant);

        // Notify room participants about the member leaving
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", ChatRoomDTO.fromEntityWithParticipants(
                chatRoomRepository.findByIdWithParticipants(roomId)
                        .orElseThrow(() -> new ResourceNotFoundException("Room not found after participant update"))));
        log.info("User {} left room {}", user.getUsername(), room.getName());
    }

    @Cacheable(value = "chatRooms", key = "#roomId")
    public ChatRoomDTO getChatRoomById(Long roomId) {
        log.info("Fetching chat room by ID: {} from DB", roomId);
        ChatRoom room = chatRoomRepository.findByIdWithParticipants(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        return ChatRoomDTO.fromEntityWithParticipants(room);
    }

    public List<ChatRoomDTO> getAllChatRooms() {
        return chatRoomRepository.findAll().stream()
                .map(ChatRoomDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "userRooms", key = "#userId")
    public List<ChatRoomDTO> getChatRoomsForUser(Long userId) {
        log.info("Fetching chat rooms for user ID: {} from DB", userId);
        return chatRoomRepository.findByParticipantUserId(userId).stream()
                .map(ChatRoomDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Set<User> getRoomParticipants(Long roomId) {
        ChatRoom room = chatRoomRepository.findByIdWithParticipants(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        return room.getParticipants().stream()
                .map(RoomParticipant::getUser)
                .collect(Collectors.toSet());
    }
}