```java
package com.alx.chat.service;

import com.alx.chat.dto.MessageDTO;
import com.alx.chat.entity.ChatRoom;
import com.alx.chat.entity.Message;
import com.alx.chat.entity.User;
import com.alx.chat.exception.AccessDeniedException;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.repository.ChatRoomRepository;
import com.alx.chat.repository.MessageRepository;
import com.alx.chat.repository.RoomMemberRepository;
import com.alx.chat.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;

    public MessageService(MessageRepository messageRepository, ChatRoomRepository chatRoomRepository, UserRepository userRepository, RoomMemberRepository roomMemberRepository) {
        this.messageRepository = messageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
        this.roomMemberRepository = roomMemberRepository;
    }

    @CacheEvict(value = "messages", key = "#messageDTO.roomId") // Evict cache for the specific room when new message is added
    @Transactional
    public MessageDTO saveMessage(MessageDTO messageDTO, Long senderId) {
        ChatRoom chatRoom = chatRoomRepository.findById(messageDTO.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + messageDTO.getRoomId()));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender user not found with ID: " + senderId));

        // Ensure sender is a member of the room
        if (!roomMemberRepository.existsByUserAndChatRoom(sender, chatRoom)) {
            throw new AccessDeniedException("User is not a member of chat room ID: " + chatRoom.getId());
        }

        Message message = new Message();
        message.setRoom(chatRoom);
        message.setSender(sender);
        message.setContent(messageDTO.getContent());

        Message savedMessage = messageRepository.save(message);
        log.info("Message sent by user {} to room {}: {}", sender.getUsername(), chatRoom.getName(), savedMessage.getContent());
        return MessageDTO.fromEntity(savedMessage);
    }

    @Cacheable(value = "messages", key = "#roomId + '-' + #page + '-' + #size")
    @Transactional(readOnly = true)
    public List<MessageDTO> getMessagesByRoomId(Long roomId, int page, int size) {
        if (!chatRoomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Chat room not found with ID: " + roomId);
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").ascending());
        log.debug("Fetching messages for room ID: {} (page: {}, size: {}) from DB", roomId, page, size);
        return messageRepository.findByRoomIdOrderBySentAtAsc(roomId, pageable).stream()
                .map(MessageDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Long getMessageCountByRoomId(Long roomId) {
        if (!chatRoomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Chat room not found with ID: " + roomId);
        }
        return messageRepository.countByRoomId(roomId);
    }

    // Optional: Add functionality to delete/edit messages, requiring authorization checks
    // For example, only sender or room admin can delete
    @CacheEvict(value = "messages", key = "#messageId")
    @Transactional
    public void deleteMessage(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with ID: " + messageId));

        // Check if the user is the sender or an admin of the room
        boolean isSender = message.getSender().getId().equals(userId);
        boolean isAdmin = roomMemberRepository.findByUserAndChatRoom(userRepository.findById(userId).orElse(null), message.getRoom())
                               .map(RoomMember::isAdmin)
                               .orElse(false);

        if (!isSender && !isAdmin) {
            throw new AccessDeniedException("User is not authorized to delete this message.");
        }

        messageRepository.delete(message);
        log.info("Message ID {} deleted by user ID {}", messageId, userId);
    }
}
```