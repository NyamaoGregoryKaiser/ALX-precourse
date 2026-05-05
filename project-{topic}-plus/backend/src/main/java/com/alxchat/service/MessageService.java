package com.alxchat.service;

import com.alxchat.dto.MessageDTO;
import com.alxchat.dto.NewMessageDTO;
import com.alxchat.exception.ResourceNotFoundException;
import com.alxchat.model.ChatRoom;
import com.alxchat.model.Message;
import com.alxchat.model.User;
import com.alxchat.repository.ChatRoomRepository;
import com.alxchat.repository.MessageRepository;
import com.alxchat.repository.RoomParticipantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RoomParticipantRepository roomParticipantRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate; // For sending WebSocket messages

    @Transactional
    public MessageDTO sendMessage(NewMessageDTO newMessageDTO, Long senderId) {
        ChatRoom room = chatRoomRepository.findById(newMessageDTO.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + newMessageDTO.getRoomId()));
        User sender = userService.getUserById(senderId);

        // Ensure sender is a participant of the room
        if (!roomParticipantRepository.existsByRoomAndUser(room, sender)) {
            throw new ResourceNotFoundException("User is not a participant of this chat room.");
        }

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .content(newMessageDTO.getContent())
                .build();
        Message savedMessage = messageRepository.save(message);

        MessageDTO messageDTO = MessageDTO.fromEntity(savedMessage);

        // Send message to all participants of the specific room via WebSocket
        // Clients should subscribe to /topic/room/{roomId}/messages
        messagingTemplate.convertAndSend("/topic/room/" + room.getId() + "/messages", messageDTO);
        log.info("Message sent by {} in room {}: {}", sender.getUsername(), room.getName(), messageDTO.getContent());
        return messageDTO;
    }

    public List<MessageDTO> getMessageHistory(Long roomId, int page, int size) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found with ID: " + roomId));
        
        Pageable pageable = PageRequest.of(page, size);
        return messageRepository.findByRoomIdOrderByTimestampDesc(roomId, pageable).stream()
                .map(MessageDTO::fromEntity)
                .collect(Collectors.toList());
    }
}