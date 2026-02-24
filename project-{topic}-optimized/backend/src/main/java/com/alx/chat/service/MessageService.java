```java
package com.alx.chat.service;

import com.alx.chat.dto.MessageDto;
import com.alx.chat.entity.Channel;
import com.alx.chat.entity.Message;
import com.alx.chat.entity.User;
import com.alx.chat.exception.ResourceNotFoundException;
import com.alx.chat.repository.ChannelRepository;
import com.alx.chat.repository.MessageRepository;
import com.alx.chat.repository.UserRepository;
import com.alx.chat.util.MessageMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing chat messages.
 * Handles saving messages and retrieving message history.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;

    /**
     * Saves a new chat message to the database.
     * @param messageDto The MessageDto containing message details.
     * @return MessageDto representing the saved message with its generated ID and timestamp.
     * @throws ResourceNotFoundException if the channel or sender is not found.
     */
    @Transactional
    public MessageDto saveMessage(MessageDto messageDto) {
        Channel channel = channelRepository.findById(messageDto.getChannelId())
                .orElseThrow(() -> new ResourceNotFoundException("Channel not found with ID: " + messageDto.getChannelId()));

        User sender = userRepository.findByUsername(messageDto.getSenderUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Sender user not found: " + messageDto.getSenderUsername()));

        Message message = Message.builder()
                .channel(channel)
                .sender(sender)
                .content(messageDto.getContent())
                .timestamp(messageDto.getTimestamp()) // Use timestamp from DTO or set by @PrePersist
                .build();

        Message savedMessage = messageRepository.save(message);
        log.info("Message saved to channel {}: {} by {}", channel.getName(), savedMessage.getContent(), sender.getUsername());
        return messageMapper.toDto(savedMessage);
    }

    /**
     * Retrieves all messages for a given channel, ordered by timestamp.
     * @param channelId The ID of the channel.
     * @return A list of MessageDto objects.
     * @throws ResourceNotFoundException if the channel is not found.
     */
    @Transactional(readOnly = true)
    public List<MessageDto> getMessagesByChannel(Long channelId) {
        if (!channelRepository.existsById(channelId)) {
            throw new ResourceNotFoundException("Channel not found with ID: " + channelId);
        }
        log.debug("Retrieving messages for channel ID: {}", channelId);
        return messageRepository.findByChannelIdOrderByTimestampAsc(channelId).stream()
                .map(messageMapper::toDto)
                .collect(Collectors.toList());
    }
}
```