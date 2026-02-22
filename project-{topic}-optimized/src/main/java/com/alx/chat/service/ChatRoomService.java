```java
package com.alx.chat.service;

import com.alx.chat.dto.ChatRoomDTO;
import com.alx.chat.dto.UserDTO;
import com.alx.chat.entity.ChatRoom;
import com.alx.chat.entity.RoomMember;
import com.alx.chat.entity.User;
import com.alx.chat.exception.BadRequestException;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.repository.ChatRoomRepository;
import com.alx.chat.repository.RoomMemberRepository;
import com.alx.chat.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;

    public ChatRoomService(ChatRoomRepository chatRoomRepository, UserRepository userRepository, RoomMemberRepository roomMemberRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
        this.roomMemberRepository = roomMemberRepository;
    }

    @Transactional
    public ChatRoomDTO createChatRoom(ChatRoomDTO chatRoomDTO, Long creatorId) {
        if (chatRoomRepository.existsByName(chatRoomDTO.getName())) {
            throw new BadRequestException("Chat room with name '" + chatRoomDTO.getName() + "' already exists.");
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Creator user not found with ID: " + creatorId));

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(chatRoomDTO.getName());
        chatRoom.setType(chatRoomDTO.getType());
        chatRoom.setCreator(creator);

        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);

        // Creator automatically joins the room
        RoomMember creatorMember = new RoomMember(creator, savedRoom, null, true); // Creator is admin
        roomMemberRepository.save(creatorMember);
        savedRoom.getMembers().add(creatorMember); // Add to the entity's collection

        log.info("Chat room '{}' created by user ID: {}", chatRoomDTO.getName(), creatorId);
        return ChatRoomDTO.fromEntity(savedRoom);
    }

    @Cacheable(value = "chatRooms", key = "#id")
    @Transactional(readOnly = true)
    public ChatRoomDTO getChatRoomById(Long id) {
        log.debug("Fetching chat room with ID: {} from DB", id);
        ChatRoom chatRoom = chatRoomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + id));
        return ChatRoomDTO.fromEntity(chatRoom);
    }

    @Cacheable(value = "chatRooms", key = "'allRooms'")
    @Transactional(readOnly = true)
    public List<ChatRoomDTO> getAllChatRooms() {
        log.debug("Fetching all chat rooms from DB");
        return chatRoomRepository.findAll().stream()
                .map(ChatRoomDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @CacheEvict(value = "chatRooms", key = "#id")
    @Transactional
    public ChatRoomDTO updateChatRoom(Long id, ChatRoomDTO chatRoomDTO) {
        ChatRoom existingRoom = chatRoomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + id));

        if (!existingRoom.getName().equals(chatRoomDTO.getName()) && chatRoomRepository.existsByName(chatRoomDTO.getName())) {
            throw new BadRequestException("Chat room with name '" + chatRoomDTO.getName() + "' already exists.");
        }

        existingRoom.setName(chatRoomDTO.getName());
        existingRoom.setType(chatRoomDTO.getType());
        // Creator cannot be changed
        ChatRoom updatedRoom = chatRoomRepository.save(existingRoom);
        log.info("Chat room with ID: {} updated.", id);
        return ChatRoomDTO.fromEntity(updatedRoom);
    }

    @CacheEvict(value = "chatRooms", allEntries = true) // Clear all cache for rooms as membership changes affect DTOs
    @Transactional
    public void deleteChatRoom(Long id) {
        if (!chatRoomRepository.existsById(id)) {
            throw new ResourceNotFoundException("Chat room not found with ID: " + id);
        }
        chatRoomRepository.deleteById(id);
        log.info("Chat room with ID: {} deleted.", id);
    }

    @CacheEvict(value = "chatRooms", key = "#roomId")
    @Transactional
    public RoomMember addMemberToChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (roomMemberRepository.existsByUserAndChatRoom(user, chatRoom)) {
            throw new BadRequestException("User is already a member of this chat room.");
        }

        RoomMember member = new RoomMember(user, chatRoom, null, false); // New members are not admins by default
        log.info("User ID {} added to chat room ID {}", userId, roomId);
        return roomMemberRepository.save(member);
    }

    @CacheEvict(value = "chatRooms", key = "#roomId")
    @Transactional
    public void removeMemberFromChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        RoomMember member = roomMemberRepository.findByUserAndChatRoom(user, chatRoom)
                .orElseThrow(() -> new ResourceNotFoundException("User is not a member of this chat room."));

        roomMemberRepository.delete(member);
        log.info("User ID {} removed from chat room ID {}", userId, roomId);
    }

    @Transactional(readOnly = true)
    public Set<UserDTO> getChatRoomMembers(Long roomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        return chatRoom.getMembers().stream()
                .map(RoomMember::getUser)
                .map(UserDTO::fromEntity)
                .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public List<ChatRoomDTO> getChatRoomsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
        return user.getRoomMemberships().stream()
                .map(RoomMember::getChatRoom)
                .map(ChatRoomDTO::fromEntity)
                .collect(Collectors.toList());
    }
}
```