package com.alxchat.dto;

import com.alxchat.model.Message;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {
    private Long id;
    private Long roomId;
    private UserDTO sender;
    private String content;
    private LocalDateTime timestamp;

    public static MessageDTO fromEntity(Message message) {
        return MessageDTO.builder()
                .id(message.getId())
                .roomId(message.getRoom().getId())
                .sender(UserDTO.fromEntity(message.getSender()))
                .content(message.getContent())
                .timestamp(message.getTimestamp())
                .build();
    }
}