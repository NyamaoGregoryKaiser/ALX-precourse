```java
package com.alx.chat.service;

import com.alx.chat.dto.chat.ChatMessage;
import com.alx.chat.entity.Message;
import com.alx.chat.entity.Room;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.mapper.MessageMapper;
import com.alx.chat.repository.MessageRepository;
import com.alx.chat.repository.RoomRepository;
import com.alx.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final MessageMapper messageMapper;

    @Transactional
    public ChatMessage saveMessage(Long senderId, Long roomId, String content) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found with ID: " + senderId));
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        Message message = Message.builder()
                .sender(sender)
                .room(room)
                .content(content)
                .build();

        Message savedMessage = messageRepository.save(message);
        return messageMapper.toDto(savedMessage);
    }

    @Transactional(readOnly = true)
    public Page<ChatMessage> getChatHistory(Long roomId, Pageable pageable) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with ID: " + roomId);
        }
        return messageRepository.findByRoomIdOrderByTimestampAsc(roomId, pageable).map(messageMapper::toDto);
    }
}
```